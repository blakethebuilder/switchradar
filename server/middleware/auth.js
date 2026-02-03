const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log('❌ Auth: No authorization header provided');
            return res.status(401).json({ message: 'No authorization header provided' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            console.log('❌ Auth: No token provided in authorization header');
            return res.status(401).json({ message: 'No token provided' });
        }

        // Use the same JWT_SECRET as the main server
        const JWT_SECRET = process.env.JWT_SECRET || '10WLkV5qHvXMgADdHm78e6DlBdH8SC4kmFUBSWaEDIQ';
        console.log('🔐 Auth: Using JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
        console.log('🎫 Auth: Token to verify:', token.substring(0, 20) + '...');

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Auth: Token verified successfully for user:', decoded.username);
        req.userData = decoded;
        next();
    } catch (error) {
        console.error('❌ Auth middleware error:', error.message);
        console.error('🔍 Auth error details:', {
            name: error.name,
            message: error.message,
            tokenProvided: !!req.headers.authorization,
            jwtSecret: (process.env.JWT_SECRET || 'switchradar_secret_key_2026').substring(0, 10) + '...'
        });
        return res.status(401).json({ message: 'Auth failed', error: error.message });
    }
};
