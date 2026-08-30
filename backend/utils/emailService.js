const nodemailer = require('nodemailer');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// Create Gmail transporter (force IPv4 to avoid ENETUNREACH on IPv6)
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE !== 'false',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 5000,   // 5 seconds to connect
        greetingTimeout: 5000,     // 5 seconds for greeting
        socketTimeout: 10000       // 10 seconds for socket operations
    });
};

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
    // Always log OTP to console as backup
    console.log(`\n[OTP] Sending to ${email}: ${otp}\n`);

    const transporter = createTransporter();

    // If SMTP not configured, fall back to console only
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('\n========================================');
        console.log('📧 EMAIL VERIFICATION OTP (No SMTP configured)');
        console.log(`📬 To: ${email}`);
        console.log(`🔑 OTP: ${otp}`);
        console.log('⏰ Valid for: 10 minutes');
        console.log('========================================\n');
        return { success: true, development: true };
    }

    // Send real email via Gmail
    try {
        const mailOptions = {
            from: `"PCCOE Interview Platform" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Verify Your PCCOE Interview Platform Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6366f1;">PCCOE Interview Platform</h1>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 10px;">
                        <h2 style="margin-top: 0;">Verify Your Email</h2>
                        <p>Thank you for registering! Please use the following OTP to verify your email address:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background: #6366f1; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 10px; display: inline-block;">
                                ${otp}
                            </div>
                        </div>
                        
                        <p style="color: #64748b; font-size: 14px;">
                            This OTP is valid for <strong>10 minutes</strong>. 
                            If you didn't request this, please ignore this email.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
                        <p>Pimpri Chinchwad College of Engineering, Pune</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    generateOTP,
    sendOTPEmail
};
