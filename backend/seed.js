const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('./models/User');
const Company = require('./models/Company');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'sahilpawarsp045@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Sahil Pawar';

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing. Check the .env file in the project root.');
        }
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
        });
        console.log(`MongoDB Atlas connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('Atlas connection error:', error.message);
        if (/whitelist|IP access|network access/i.test(error.message)) {
            console.error('Add this machine IP in Atlas → Security → Network Access (or 0.0.0.0/0 for local development).');
        }
        process.exit(1);
    }
};

const seedAdmin = async () => {
    try {
        await connectDB();

        let admin = await User.findOne({ email: ADMIN_EMAIL }).select('+password');

        if (admin) {
            admin.name = ADMIN_NAME;
            admin.role = 'admin';
            admin.isActive = true;
            admin.emailVerified = true;
            admin.branch = admin.branch || 'Computer Engineering';
            admin.year = admin.year || 'Final Year';
            admin.password = ADMIN_PASSWORD;
            await admin.save();
            console.log('Existing user promoted/updated as admin');
        } else {
            await User.create({
                name: ADMIN_NAME,
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                role: 'admin',
                branch: 'Computer Engineering',
                year: 'Final Year',
                isActive: true,
                emailVerified: true
            });
            console.log('Admin user created successfully');
        }

        console.log(`Email: ${ADMIN_EMAIL}`);
        console.log(`Password: ${ADMIN_PASSWORD}`);

        // Seed some companies
        const companies = [
            { companyName: 'TCS', sector: 'IT', website: 'https://www.tcs.com' },
            { companyName: 'Infosys', sector: 'IT', website: 'https://www.infosys.com' },
            { companyName: 'Wipro', sector: 'IT', website: 'https://www.wipro.com' },
            { companyName: 'Cognizant', sector: 'IT', website: 'https://www.cognizant.com' },
            { companyName: 'Accenture', sector: 'Consulting', website: 'https://www.accenture.com' },
            { companyName: 'Capgemini', sector: 'IT', website: 'https://www.capgemini.com' },
            { companyName: 'Tech Mahindra', sector: 'IT', website: 'https://www.techmahindra.com' },
            { companyName: 'HCL Technologies', sector: 'IT', website: 'https://www.hcltech.com' },
            { companyName: 'L&T Infotech', sector: 'IT', website: 'https://www.ltimindtree.com' },
            { companyName: 'Persistent Systems', sector: 'IT', website: 'https://www.persistent.com' },
            { companyName: 'Amazon', sector: 'E-commerce', website: 'https://www.amazon.com' },
            { companyName: 'Microsoft', sector: 'IT', website: 'https://www.microsoft.com' },
            { companyName: 'Google', sector: 'IT', website: 'https://www.google.com' },
            { companyName: 'Deloitte', sector: 'Consulting', website: 'https://www.deloitte.com' },
            { companyName: 'KPMG', sector: 'Consulting', website: 'https://www.kpmg.com' }
        ];

        for (const company of companies) {
            const exists = await Company.findOne({ companyName: company.companyName });
            if (!exists) {
                await Company.create(company);
                console.log(`Company ${company.companyName} added`);
            }
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedAdmin();
