const { z } = require('zod');

const email = z.string().trim().email().max(254).transform(value => value.toLowerCase());
const password = z.string().min(8).max(128).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/,
    'A senha deve conter maiúsculas, minúsculas, número e caractere especial'
);

module.exports = {
    register: z.object({
        name: z.string().trim().min(2).max(120),
        email,
        password
    }),
    login: z.object({
        email,
        password: z.string().min(1).max(128)
    }),
    profile: z.object({
        name: z.string().trim().min(2).max(120),
        email
    }),
    changePassword: z.object({
        currentPassword: z.string().min(1).max(128),
        newPassword: password
    })
};
