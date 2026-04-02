const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Path to data
const dataPath = path.join(__dirname, 'data', 'jobs.json');
const usersPath = path.join(__dirname, 'data', 'users.json');
const appsPath = path.join(__dirname, 'data', 'applications.json');

// Helpers
const readJobs = () => { try { return JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch (e) { return []; } };
const readUsers = () => { try { return JSON.parse(fs.readFileSync(usersPath, 'utf8')); } catch (e) { return []; } };
const readApps = () => { try { return JSON.parse(fs.readFileSync(appsPath, 'utf8')); } catch (e) { return []; } };

// Routes
app.get('/api/jobs', (req, res) => res.json(readJobs()));

app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;
    const users = readUsers();
    const user = users.find(u => u.email === email && u.password === password && u.role === role);
    if (user) res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    else res.status(401).json({ success: false, error: "Invalid credentials or role" });
});

app.post('/api/register', (req, res) => {
    const { name, email, password, role } = req.body;
    const users = readUsers();
    if (users.some(u => u.email === email)) return res.status(400).json({ success: false, error: "Email already registered" });
    const newUser = { id: Date.now(), name, email, password, role };
    users.push(newUser);
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    res.status(201).json({ success: true, user: { id: newUser.id, name, email, role } });
});

// Admin: Get all applications
app.get('/api/applications', (req, res) => res.json(readApps()));

// Admin: Update application status (Accept/Reject)
app.patch('/api/applications/:id', (req, res) => {
    const { status } = req.body;
    const apps = readApps();
    const appIndex = apps.findIndex(a => a.id == req.params.id);
    
    if (appIndex !== -1) {
        apps[appIndex].status = status;
        fs.writeFileSync(appsPath, JSON.stringify(apps, null, 2));
        res.json({ success: true, application: apps[appIndex] });
    } else {
        res.status(404).json({ error: "Application not found" });
    }
});

// Jobseeker: Submit application
app.post('/api/apply', (req, res) => {
    const { jobId, jobTitle, company, applicantName, applicantEmail, phone, experience, resume } = req.body;
    const apps = readApps();
    const newApp = { 
        id: Date.now(), jobId, jobTitle, company, applicantName, applicantEmail, 
        phone, experience, resume, status: 'Pending', date: new Date().toLocaleDateString() 
    };
    apps.push(newApp);
    fs.writeFileSync(appsPath, JSON.stringify(apps, null, 2));
    res.status(201).json({ success: true, application: newApp });
});

app.post('/api/jobs', (req, res) => {
    const newJob = req.body;
    const jobs = readJobs();
    newJob.id = Date.now();
    jobs.push(newJob);
    fs.writeFileSync(dataPath, JSON.stringify(jobs, null, 2));
    res.status(201).json(newJob);
});

// Root route
app.get('/', (req, res) => {
    res.send('JobFinder API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
