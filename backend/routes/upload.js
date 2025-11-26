// Upload route handles the heavy lifting for customer distribution.
const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Papa = require('papaparse');
const Agent = require('../models/Agent');
const Distribution = require('../models/Distribution');
const authenticateToken = require('../middleware/auth');

// Keep files in memory since uploads are small and short-lived.
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, XLS, and XLSX files are allowed.'));
    }
  },
});

// Helpers stay near the top so the main route reads cleaner.
const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const csvString = buffer.toString('utf-8');
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
};

const parseExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

// Round-robin assignment keeps the workload even.
const distributeCustomers = (customers, agents) => {
  const distributions = agents.map(() => []);
  
  customers.forEach((customer, index) => {
    const agentIndex = index % agents.length;
    distributions[agentIndex].push(customer);
  });
  
  return distributions;
};

router.post('/customers', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a CSV, XLS, or XLSX file.',
      });
    }

    // Only active agents should receive customers.
    const agents = await Agent.find({ isActive: true }).select('-password');
    
    if (agents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active agents found. Please create agents first.',
      });
    }

    let customers = [];
    const fileExt = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));

    try {
      // Decide how to parse based on the provided extension.
      if (fileExt === '.csv') {
        customers = await parseCSV(req.file.buffer);
      } else if (fileExt === '.xls' || fileExt === '.xlsx') {
        customers = parseExcel(req.file.buffer);
      } else {
        throw new Error('Unsupported file format');
      }
    } catch (parseError) {
      console.error('File Parsing Error:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Failed to parse file. Please ensure the file is properly formatted.',
        error: parseError.message,
      });
    }

    if (!customers || customers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid customer data found in the file.',
      });
    }

    // Clean headers and ensure we have the bare minimum fields.
    const validCustomers = customers.filter(customer => {
      const cleanCustomer = {};
      Object.keys(customer).forEach(key => {
        cleanCustomer[key.trim()] = customer[key];
      });
      
      return cleanCustomer.FirstName || cleanCustomer.Phone;
    });

    if (validCustomers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid customers found. Please ensure the file contains FirstName and Phone fields.',
      });
    }

    const normalizedCustomers = validCustomers.map(customer => {
      const cleanCustomer = {};
      Object.keys(customer).forEach(key => {
        cleanCustomer[key.trim()] = customer[key];
      });
      
      return {
        FirstName: cleanCustomer.FirstName || '',
        Phone: cleanCustomer.Phone || '',
        Notes: cleanCustomer.Notes || '',
      };
    });

    const distributions = distributeCustomers(normalizedCustomers, agents);

    // Push assignments to each agent separately so history is preserved.
    const updatePromises = agents.map((agent, index) => {
      return Agent.findByIdAndUpdate(
        agent._id,
        {
          $push: {
            assignedCustomers: {
              $each: distributions[index],
            },
          },
        },
        { new: true }
      ).select('-password');
    });

    const updatedAgents = await Promise.all(updatePromises);

    try {
      const assignments = updatedAgents.map((agent, index) => ({
        agent: agent._id,
        customers: distributions[index],
        count: distributions[index].length,
      }));

      const distributionDoc = new Distribution({
        filename: req.file.originalname,
        uploadedBy: req.user && req.user.id ? req.user.id : undefined,
        totalCustomers: normalizedCustomers.length,
        assignments,
      });

      await distributionDoc.save();

      var persistedDistributionId = distributionDoc._id;
    } catch (persistErr) {
      console.error('Distribution persist error:', persistErr);
      var persistedDistributionId = null;
    }

    const distributionSummary = updatedAgents.map((agent, index) => ({
      agentId: agent._id,
      agentName: agent.name,
      agentEmail: agent.email,
      customersAssigned: distributions[index].length,
      totalCustomers: agent.assignedCustomers.length,
    }));

    res.json({
      success: true,
      message: `Successfully uploaded and distributed ${normalizedCustomers.length} customers among ${agents.length} agents.`,
      totalCustomers: normalizedCustomers.length,
      totalAgents: agents.length,
      distribution: distributionSummary,
      distributionId: persistedDistributionId,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process upload.',
      error: error.message,
    });
  }
});

router.get('/distribution', authenticateToken, async (req, res) => {
  try {
    // Agent list doubles as both roster + distribution snapshot.
    const agents = await Agent.find().select('-password');

    const distribution = agents.map(agent => ({
      agentId: agent._id,
      agentName: agent.name,
      agentEmail: agent.email,
      totalCustomers: agent.assignedCustomers.length,
      customers: agent.assignedCustomers,
    }));

    res.json({
      success: true,
      distribution,
    });
  } catch (error) {
    console.error('Get Distribution Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch distribution data.',
    });
  }
});

module.exports = router;