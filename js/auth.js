const Auth = {
    currentUser: null,

    async login(username, password) {
        const user = await db.users.where("username").equals(username).first();
        
        if (user && user.password === password) {
            this.currentUser = user;
            sessionStorage.setItem("user", JSON.stringify(user));
            await logAction(user.id, "Login", "Usuario inició sesión");
            return true;
        }
        return false;
    },

    logout() {
        if (this.currentUser) {
            logAction(this.currentUser.id, "Logout", "Usuario cerró sesión");
        }
        this.currentUser = null;
        sessionStorage.removeItem("user");
        location.reload();
    },

    isLoggedIn() {
        if (!this.currentUser) {
            const savedUser = sessionStorage.getItem("user");
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
            }
        }
        return !!this.currentUser;
    },

    async getSecurityQuestion(username) {
        const user = await db.users.where("username").equals(username).first();
        return user ? user.securityQuestion : null;
    },

    async verifySecurityAnswer(username, answer) {
        const user = await db.users.where("username").equals(username).first();
        return user && user.securityAnswer.toLowerCase() === answer.toLowerCase();
    },

    async resetPassword(username, newPassword) {
        const user = await db.users.where("username").equals(username).first();
        if (user) {
            await db.users.update(user.id, { password: newPassword });
            await logAction(user.id, "Password Reset", "Contraseña restablecida vía pregunta de seguridad");
            return true;
        }
        return false;
    }
};
