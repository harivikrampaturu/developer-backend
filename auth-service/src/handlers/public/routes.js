import { Router } from 'express';
import { createUserHandler, deleteUserHandler, getProfileDetailsHandler, listUserByIdHandler, listUsersHandler, loginHandler, logoutHandler, tokenValidationHandler, updateUserhandler, welcomeHandler } from './handlers';
import tokenValidation from '../../middlewares/validations';
import { createApiKeyHandler, deleteApiKeyHandler, getApiKeyById, listApiKeysHandler, updateApiKeyHandler, validateApiKeyHandler } from './keyhandlers';

const router = Router();

router.get('/', tokenValidation, welcomeHandler);
router.get('/users', tokenValidation, listUsersHandler);
router.post('/users', createUserHandler);
router.get('/users/me', tokenValidation, getProfileDetailsHandler);
router.get('/users/:userId', tokenValidation, listUserByIdHandler);
router.patch('/users/:userId', tokenValidation, updateUserhandler);
router.delete('/users/:userId', tokenValidation, deleteUserHandler);
router.get('/validate-token', tokenValidationHandler);

router.post('/login', loginHandler);
router.get('/logout', logoutHandler);

router.get('/apikeys', tokenValidation, listApiKeysHandler);
router.post('/apikeys', tokenValidation, createApiKeyHandler);
router.get('/apikeys/:apikeyId', tokenValidation, getApiKeyById);
router.get('/validate-key/:apikeyId', validateApiKeyHandler);
router.patch('/apikeys/:apikeyId', tokenValidation, updateApiKeyHandler);
router.delete('/apikeys/:apikeyId', tokenValidation, deleteApiKeyHandler);

export default router;
