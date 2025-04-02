import Users from '../database/models/Users';

/**
 * Check if a user exists by their ID
 * @param {string} id - The ID of the user to check
 * @returns {Promise<boolean>} True if the user exists, false otherwise
 */
export const isUserExits = async (id) => {
    const existingUser = await Users.findById(id);

    if (!existingUser) {
        return false;
    }

    return true;
};
