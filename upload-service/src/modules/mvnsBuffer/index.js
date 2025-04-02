/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */

// version MVNS_DGC_BVS_VAD_LIB_WEBSOCKET_V1P8_02JAN2025
import * as fs from 'fs';
import * as ctypes from 'ffi-napi';
import * as ref from 'ref-napi';
import { FileWriter } from 'wav';
import { Readable } from 'stream';
import { logger } from 'a-logger';
import path from 'path';

// import { upload } from '../record';


const BIN_FOLDER = path.resolve('./src/modules/mvnsBuffer/bin');

const intPtr = ref.refType('int');
const { int16, uint8 } = ref.types;
const int16Ptr = ref.refType(int16);
const uintPtr = ref.refType(uint8);
const charPtr = ref.refType('char');

const MT_CV_MVNS_FAILURE = -1;
const MT_CV_MVNS_LICENSE_EXPIRED = -2;
const MT_CV_MVNS_STATE_MEM_SIZE = 227000;
const MT_CV_MVNS_SUCCESS = 0;

const MT_CV_BVC_FAILURE = -1;
const MT_CV_BVC_LICENSE_EXPIRED = -2;
const MT_CV_BVC_STATE_MEM_SIZE = 3004000;
const MT_CV_BVC_SUCCESS = 0;

const mvnsLibPath = `${BIN_FOLDER}/libmvns.so`;
const bvsLibPath = `${BIN_FOLDER}/libbvs.so`;

const sampleRate = 8000;
// const framesz = 160;
const dspOpt = 1;
const vadFrames = 26; // BVS processes 10 ms (80 samples) per frame
// For an input frame size of 2048 samples, BVS will process 26 frames

class Mvns {
    constructor(fileTap, fileTapPathC, logMeta) {
        this.op_sampcnt = 0;
        this.fileTap = fileTap;
        this.fileTapPathC = fileTapPathC;
        this.tag = 'mvns';
        this.logMeta = logMeta;

        if (!fs.existsSync(mvnsLibPath) && mvnsLibPath.toLowerCase().endsWith('.so')) {
            logger.debug(this.tag, `unable to open .so file ${mvnsLibPath}`, logMeta);
            throw new Error('MVNS lib not found');
        }

        this.mvns_dll = new ctypes.Library(mvnsLibPath, {
            mt_cv_mvns_init: ['int', [intPtr, 'int', 'int']], // , 'int', 'int', charPtr]],
            mt_cv_mvns_process: ['int', [intPtr, int16Ptr, int16Ptr, 'int']], // , 'int']],
            mt_cv_mvns_deinit: ['int', [intPtr]],
        });

        this.mvns_obj_p = new Int32Array(MT_CV_MVNS_STATE_MEM_SIZE);
        const status = this.mvns_dll.mt_cv_mvns_init(this.mvns_obj_p, sampleRate, sampleRate); // dspOpt, fileTap, fileTapPathC);

        if (status !== MT_CV_MVNS_SUCCESS) {
            logger.debug(this.tag, `Unable to initialize MVNS from ${mvnsLibPath}`, logMeta);
        } else {
            logger.debug(this.tag, 'MVNS initialized successfully', logMeta);
        }
    }

    process(audio) {
        const audioLength = audio.byteLength;// framesz * 2;
        const opData = Buffer.alloc(audioLength); // Buffer.alloc(framesz * 2);
        opData.fill(0);
        this.op_sampcnt = this.mvns_dll.mt_cv_mvns_process(this.mvns_obj_p, audio, opData, audioLength / 2); // , this.fileTap);

        if (this.op_sampcnt === MT_CV_MVNS_FAILURE) {
            logger.debug(this.tag, 'Data Unable to Process by MVNS', this.logMeta);
            return audio;
        }
        if (this.op_sampcnt === MT_CV_MVNS_LICENSE_EXPIRED) {
            logger.debug(this.tag, 'Product date has been expired !!!', this.logMeta);
            return audio;
        }

        if (this.op_sampcnt === 0) {
            opData.fill(0);
        }
        return opData;
    }

    deinit() {
        const status = this.mvns_dll.mt_cv_mvns_deinit(this.mvns_obj_p);
        if (status !== MT_CV_MVNS_SUCCESS) {
            logger.debug(this.tag, 'Unable to de-initialize MVNS', this.logMeta);
        }
    }
}

class Bvs {
    constructor(fileTap, fileTapPathC, logMeta) {
        this.tag = 'bvs';
        this.logMeta = logMeta;
        this.op_sampcnt = 0;
        this.fileTap = fileTap;
        this.fileTapPathC = fileTapPathC;

        if (!fs.existsSync(bvsLibPath) && bvsLibPath.toLowerCase().endsWith('.so')) {
            logger.debug(this.tag, `unable to open .so file ${bvsLibPath}`, this.logMeta);
            process.exit(1);
        }

        this.bvs_dll = new ctypes.Library(bvsLibPath, {
            mt_cv_bvs_init: ['int', [intPtr, 'int', 'int']], // , 'int', charPtr]],
            mt_cv_bvs_process: ['int', [intPtr, int16Ptr, int16Ptr, uintPtr, 'int']], // , 'int']],
            mt_cv_bvs_deinit: ['int', [intPtr]],
        });

        this.bvs_obj_p = new Int32Array(MT_CV_BVC_STATE_MEM_SIZE);
        const status = this.bvs_dll.mt_cv_bvs_init(this.bvs_obj_p, sampleRate, sampleRate); // fileTap, fileTapPathC);

        if (status !== MT_CV_BVC_SUCCESS) {
            logger.debug(this.tag, `Unable to initialize BVC from ${bvsLibPath}`, this.logMeta);
        } else {
            logger.debug(this.tag, 'BVC initialized successfully', this.logMeta);
        }
    }

    process(audio, vadData) {
        const audioLength = audio.byteLength; // framesz * 2
        const opData = Buffer.alloc(audioLength);
        opData.fill(0);
        this.op_sampcnt = this.bvs_dll.mt_cv_bvs_process(this.bvs_obj_p, audio, opData, vadData, audioLength / 2); // , this.fileTap);

        if (this.op_sampcnt === MT_CV_BVC_FAILURE) {
            logger.debug(this.tag, 'Data Unable to Process by BVC', this.logMeta);
            return audio;
        }
        if (this.op_sampcnt === MT_CV_BVC_LICENSE_EXPIRED) {
            logger.debug(this.tag, '\n\n Product date has been expired !!!', this.logMeta);
            return audio;
        }

        if (this.op_sampcnt === 0) {
            opData.fill(0);
        }
        return opData;
    }

    deinit() {
        const status = this.bvs_dll.mt_cv_bvs_deinit(this.bvs_obj_p);
        if (status !== MT_CV_BVC_SUCCESS) {
            logger.debug(this.tag, 'Unable to de-initialize BVC', this.logMeta);
        }
    }
}
/**
 * Noise suppressor
 * @param {*} onData Callback function
 * @param {Object} logMeta meta object for log
 * @param {Boolean} mvnsFlag is Mvns enabled
 * @param {Boolean} bvsFlag is bvs enabled
 * @param {String} fileTapPath optional filepath if output file recording enabled
 * @returns object with write and close methods
 */
export function noiseSuppressor(onData, logMeta, mvnsFlag, bvsFlag, fileTapPath, csConfig) {
    const tag = 'noiseSuppressor';
    logger.info(tag, `starting noise canceller with ${JSON.stringify({ mvnsFlag, bvsFlag, fileTapPath })}`, logMeta);

    // const messageCount = 0;
    const nsStream = new Readable();
    nsStream._read = () => { };
    nsStream.end = () => { nsStream.push(null); };

    let inputFileStream;
    if (fileTapPath) {
        inputFileStream = new FileWriter(`${fileTapPath}_input.wav`, {
            sampleRate,
            channels: 1,
        });
    }

    const fileTapFlag = fileTapPath ? 1 : 0;
    const fileTapPathC = Buffer.from((fileTapPath || '').toString(), 'utf-8');
    const vadData = Buffer.alloc(vadFrames, 0); // BVS processes 10 ms (80 samples) per frame

    /**
     * @type {Mvns}
     */
    let mvns;
    /**
    * @type {Bvs}
    */
    let bvs;
    if (mvnsFlag) {
        mvns = new Mvns(fileTapFlag, fileTapPathC, logMeta);
    }

    if (bvsFlag) {
        bvs = new Bvs(fileTapFlag, fileTapPathC, logMeta);
    }
    // upload(nsStream, logMeta, csConfig);
    function close() {
        logger.info(tag, 'noise canceller closed', logMeta);
        if (mvnsFlag) {
            mvns.deinit();
        }
        if (bvsFlag) {
            bvs.deinit();
        }
        nsStream.end(() => { });
        inputFileStream?.end(() => { });
    }
    function write(audio) { // process audio message
        let opData = Buffer.alloc(audio.byteLength); // framesz * 2;
        inputFileStream?.write(Buffer.from(audio), () => { });
        try {
            if (mvnsFlag) {
                const mvnsOpData = mvns.process(audio);
                if (bvsFlag) {
                    if (mvns.op_sampcnt > 0) opData = bvs.process(mvnsOpData, vadData);
                } else {
                    opData = mvnsOpData;
                }
            } else if (bvsFlag) {
                opData = bvs.process(audio, vadData);
            } else {
                opData = audio;
            }
            const output = Buffer.from(opData.buffer);
            onData(output);
            nsStream.push(output);
            // return Buffer.from(opData.buffer);

            // messageCount += 1;
            // logger.debug(this.tag, `Received message ${messageCount}`);
            // process.stdout.write(`\rReceived message ${messageCount}`);
        } catch (error) {
            logger.debug(this.tag, `Internal Server Error.${error}`, logMeta);
            onData(opData);
            nsStream.push(Buffer.from(opData));
            // return message;
        }
    }

    return {
        nsStream,
        write,
        close,
    };
}
