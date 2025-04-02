/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-use-before-define */
/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable max-classes-per-file */

import fs from 'fs';
import ctypes from 'ffi-napi';
import ref from 'ref-napi';
import { Writer, FileWriter, Reader } from 'wav';
import path from 'path';
import { Readable } from 'stream';
import logger from 'a-logger';

const BIN_FOLDER = path.resolve('./src/modules/mvns/bin');

const intPtr = ref.refType('int');
const { int16 } = ref.types;
const int16Ptr = ref.refType(int16);

const MT_CV_STATE_MEM_SIZE = 5850000;
const MT_CV_SUCCESS = 0;
const MT_CV_FAILURE = -1;
const MT_CV_LICENSE_EXPIRED = -2;

const cvLibPath = `${BIN_FOLDER}/libcv.so`;

class CV {
    constructor(ipSamplingrate, opSamplingrate, mvnsFlag, dgcFlag, bvsFlag, logMeta) {
        // Input validation for mvnsFlag
        if (![0, 1, 2, 3].includes(mvnsFlag)) {
            logger.error(this.tag, `Invalid mvnsFlag value: ${mvnsFlag}. Must be 0-3`, logMeta);
            throw new Error('Invalid mvnsFlag value');
        }

        // Input validation for dgcFlag and bvsFlag
        if (![0, 1].includes(dgcFlag)) {
            logger.error(this.tag, `Invalid dgcFlag value: ${dgcFlag}. Must be 0 or 1`, logMeta);
            throw new Error('Invalid dgcFlag value');
        }

        if (![0, 1].includes(bvsFlag)) {
            logger.error(this.tag, `Invalid bvsFlag value: ${bvsFlag}. Must be 0 or 1`, logMeta);
            throw new Error('Invalid bvsFlag value');
        }

        this.tag = 'cv';
        this.logMeta = logMeta;

        if (!fs.existsSync(cvLibPath)) {
            logger.error(this.tag, `Unable to find CV library at path: ${cvLibPath}`, logMeta);
            throw new Error(`CV lib not found at ${cvLibPath}`);
        }

        this.cv_dll = new ctypes.Library(cvLibPath, {
            mt_cv_api_init: ['int', [intPtr, 'int', 'int', int16, int16, int16, intPtr]],
            mt_cv_api_process: ['int', [intPtr, int16Ptr, int16Ptr, 'int']],
            mt_cv_api_deinit: ['int', [intPtr]]
        });

        this.cv_obj_p = new Int32Array(MT_CV_STATE_MEM_SIZE);
        const parm = new Int32Array(10);

        // Set parameters
        parm[0] = 2; // GMM VAD mode
        parm[1] = ipSamplingrate;
        parm[2] = 0;
        parm[3] = 0;
        parm[4] = 31000; // Power
        parm[5] = 8; // max_g

        const status = this.cv_dll.mt_cv_api_init(this.cv_obj_p, ipSamplingrate, opSamplingrate, mvnsFlag, dgcFlag, bvsFlag, parm);

        if (status !== MT_CV_SUCCESS) {
            logger.error(this.tag, 'Unable to initialize CV', logMeta);
        } else {
            logger.info(this.tag, 'CV initialized successfully', logMeta);
        }
    }

    process(audio, frameSize) {
        const audioLength = audio.byteLength;
        const opData = Buffer.alloc(audioLength);
        opData.fill(0);

        const op_sampcnt = this.cv_dll.mt_cv_api_process(this.cv_obj_p, audio, opData, frameSize);

        if (op_sampcnt === MT_CV_FAILURE) {
            logger.error(this.tag, 'Data Unable to Process by CV', this.logMeta);
            return { data: audio, samples: 0 };
        }
        if (op_sampcnt === MT_CV_LICENSE_EXPIRED) {
            logger.error(this.tag, 'Product license has expired', this.logMeta);
            return { data: audio, samples: 0 };
        }

        return { data: opData, samples: op_sampcnt };
    }

    deinit() {
        const status = this.cv_dll.mt_cv_api_deinit(this.cv_obj_p);
        if (status !== MT_CV_SUCCESS) {
            logger.error(this.tag, 'Unable to de-initialize CV', this.logMeta);
        }
        return status;
    }
}

export function noiseSuppressor(onData, logMeta, mvnsFlag, dgcFlag, bvsFlag, fileTapPath, csConfig) {
    const tag = 'noiseSuppressor';
    logger.info(
        tag,
        `Starting noise canceller with ${JSON.stringify({
            mvnsFlag,
            dgcFlag,
            bvsFlag,
            fileTapPath
        })}`,
        logMeta
    );

    const nsStream = new Readable();
    nsStream._read = () => {};
    nsStream.end = () => {
        nsStream.push(null);
    };

    const ipSamplingrate = 8000;
    const opSamplingrate = 8000;
    const frameSize = 160;

    let inputFileStream;
    let outputFileStream;
    if (fileTapPath) {
        inputFileStream = new FileWriter(`${fileTapPath}_input.wav`, {
            sampleRate: ipSamplingrate,
            channels: 1
        });
        outputFileStream = new FileWriter(`${fileTapPath}_output.wav`, {
            sampleRate: opSamplingrate,
            channels: 1
        });
    }

    const cv = new CV(ipSamplingrate, opSamplingrate, mvnsFlag, dgcFlag, bvsFlag, logMeta);

    function close() {
        logger.info(tag, 'Noise canceller closed', logMeta);
        cv.deinit();
        nsStream.end(() => {});
        inputFileStream?.end(() => {});
        outputFileStream?.end(() => {});
    }

    function write(audio) {
        inputFileStream?.write(Buffer.from(audio), () => {});

        try {
            let processedAudio;
            if (mvnsFlag || dgcFlag || bvsFlag) {
                const result = cv.process(audio, frameSize);
                processedAudio = result.data;
                if (result.samples <= 0) {
                    processedAudio = audio;
                }
            } else {
                processedAudio = audio;
            }
            const output = Buffer.from(processedAudio);
            
            outputFileStream?.write(output, () => {});
            onData(output); // original
            // onData(processedAudio);
            nsStream.push(output);
            return output;
        } catch (error) {
            logger.error(tag, `Internal Server Error: ${error}`, logMeta);
            onData(audio);
            nsStream.push(Buffer.from(audio));
        }
    }

    return {
        nsStream,
        write,
        close
    };
}

// for file based -------------------------
const timer = (ms) =>
    new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
async function processFile(fileName) {
    logger.info('Connection accepted');
    const startTime = Date.now();
    const message_count = 0;
    const framesz = 160;
    // const op_file = fs.createWriteStream("op.bin");

    const mvnsFlag = 1;
    const dgcFlag = 1;
    const bvsFlag = 1;
    const fileData = fs.readFileSync(fileName);
    const r = new Reader({});
    const pcmArr = [];
    r.on('format', (format) => {
        logger.info('format', format);
    });
    r.once('data', (data) => {
        pcmArr.push(data);
    });
    r.write(fileData);
    r.push(null);

    r.once('end', () => {
        logger.info('end');
    });
    await timer(500);
    const pcmData = Buffer.concat(pcmArr);

    // open file
    const outputFileStream = new FileWriter('./out.wav', {
        sampleRate: 8000,
        channels: 1
    });
    outputFileStream.on('error', (err) => {
        logger.info('outputFileStream error', err);
    });
    let started = false;

    const ns = noiseSuppressor(
        (data) => {
            if (!outputFileStream.closed) {
                outputFileStream.write(data, () => {});
            }
        },
        {},
        mvnsFlag,
        dgcFlag,
        bvsFlag,
        null,
        {}
    );

    logger.info('init success');

    logger.info(pcmData.length, 'pcmDnsStreamata.length');
    logger.info(pcmData.byteLength, 'pcmData.byteLength');
    logger.info(pcmData.byteOffset, 'pcmData.byteOffset');
    // write 160 samples at a time
    let offset = pcmData.byteOffset;
    for (let i = 0; i < pcmData.length; i += framesz) {
        try {
            if (!started) {
                logger.info(Date.now() - startTime, 'start time');
                started = true;
            }
            if (i + framesz >= pcmData.length) {
                break;
            }
            ns.write(new Int16Array(pcmData.buffer, offset, framesz));
            offset += framesz + framesz;
        } catch (error) {
            logger.info('Internal Server Error.', error, 'size', i);
            break;
        }
    }

    logger.info(`Connection closed. Received a total of ${message_count} messages`);
    ns.close();
    outputFileStream?.end(() => {});
}
