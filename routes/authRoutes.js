const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');

const JWT_SECRET = "HQ_SECURE_CIPHER_KEY_2026";

const verificationStore = new Map();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ error: "Missing identity credentials" });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: "Codename already registered in active registry" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRole = await Role.findOne({ where: { name: 'USER' } });

    const newUser = await User.create({
      username,
      password: hashedPassword,
      roleId: userRole ? userRole.id : null
    });

    res.status(201).json({ message: "Operative successfully registered", userId: newUser.id });
  } catch (err) {
    res.status(500).json({ error: "Server Error during Registration" });
  }
});

// ============================================================
// STEP 1: CREDENTIAL VERIFICATION GATEWAY
// ============================================================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({
      where: { username },
      include: [{
        model: Role,
        include: [Permission]
      }]
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid Operative Credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Operative Credentials" });
    }

    const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`\n======================================================`);
    console.log(`[SIMULATION] 🛡️ FACTOR 2: SECURE EMAIL VERIFICATION CODE`);
    console.log(`To: ${username}@vigil.hq`);
    console.log(`Verification Code: ${emailCode}`);
    console.log(`======================================================\n`);

    verificationStore.set(username, { emailCode, currentStep: 2 });

    res.json({ status: "AWAITING_EMAIL_VERIFICATION", username });
  } catch (err) {
    res.status(500).json({ error: "Server Error during Authentication Gateway" });
  }
});

router.post('/verify-email', async (req, res) => {
  const { username, emailCode } = req.body;
  const authSession = verificationStore.get(username);

  if (!authSession || authSession.currentStep !== 2 || authSession.emailCode !== emailCode) {
    return res.status(400).json({ error: "Invalid or expired Email verification code." });
  }

  // Step 2 Complete -> Generate Factor 3: Simulated OTP Token
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  console.log(`\n======================================================`);
  console.log(`[SIMULATION] 🛡️ FACTOR 3: SECURE MOBILE ONE-TIME PASSWORD (OTP)`);
  console.log(`To: Operative Encrypted Communication Node (${username})`);
  console.log(`OTP Token: ${otpCode}`);
  console.log(`======================================================\n`);

  verificationStore.set(username, { otpCode, currentStep: 3 });

  res.json({ status: "AWAITING_OTP_VERIFICATION", username });
});

router.post('/verify-otp', async (req, res) => {
  const { username, otpCode } = req.body;
  const authSession = verificationStore.get(username);

  if (!authSession || authSession.currentStep !== 3 || authSession.otpCode !== otpCode) {
    return res.status(400).json({ error: "Invalid or expired OTP token." });
  }

  try {
    verificationStore.delete(username);

    const user = await User.findOne({
      where: { username },
      include: [{
        model: Role,
        include: [Permission]
      }]
    });

    const permissions = user.Role ? user.Role.Permissions.map(p => p.name) : [];
    const roleName = user.Role ? user.Role.name : 'USER';

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: roleName,
      permissions: permissions
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30s' });

    res.json({
      token: `Bearer ${token}`,
      user: {
        id: user.id,
        username: user.username,
        role: roleName,
        permissions: permissions
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Server Error during final session authorization sequence." });
  }
});

  router.post('/forgot-password', async (req, res) => {
  const { username } = req.body;

  try {
    const user = await User.findOne({ where: { username } });
    
    if (user) {
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

      console.log(`\n======================================================`);
      console.log(`[SIMULATION] 🔄 SECURE PASSWORD RECOVERY INITIATED`);
      console.log(`To: ${username}@vigil.hq`);
      console.log(`Recovery Code: ${resetCode}`);
      console.log(`======================================================\n`);

      verificationStore.set(username + '_reset', { 
        resetCode, 
        expires: Date.now() + 15 * 60000 
      });
    }

    res.json({ message: "If the Operative ID exists, a recovery code has been transmitted." });
  } catch (err) {
    res.status(500).json({ error: "Server Error during recovery initiation." });
  }
});

router.post('/reset-password', async (req, res) => {
  const { username, resetCode, newPassword } = req.body;

  try {
    const session = verificationStore.get(username + '_reset');

    if (!session || session.resetCode !== resetCode || Date.now() > session.expires) {
      return res.status(400).json({ error: "Invalid or expired recovery code." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New passkey must be at least 6 characters." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.update({ password: hashedPassword }, { where: { username } });

    verificationStore.delete(username + '_reset');

    res.json({ message: "Passkey successfully overwritten." });
  } catch (err) {
    res.status(500).json({ error: "Server Error during password reset." });
  }
});

module.exports = router;