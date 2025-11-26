import React, { useState, useEffect } from 'react';
import { Upload, Users, UserPlus, LogOut, Eye, Trash2, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;
// Most calls hit the same base URL, so keep it configurable.

function App() {
  // Local UI state is grouped roughly by feature area.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [currentView, setCurrentView] = useState('agents');
  const [agents, setAgents] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [distHistory, setDistHistory] = useState([]);
  const [selectedDistribution, setSelectedDistribution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentMobile, setAgentMobile] = useState('');
  const [agentPassword, setAgentPassword] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    // Keep the user signed in across refreshes if a token is present.
    const savedToken = window.localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    // This fixer watches for browser autofill so the state stays in sync.
    try {
      setTimeout(() => {
        const emailInput = document.getElementById('login-email');
        const passInput = document.getElementById('login-password');
        if (emailInput && emailInput.value && emailInput.value !== loginEmail) {
          setLoginEmail(emailInput.value);
        }
        if (passInput && passInput.value && passInput.value !== loginPassword) {
          setLoginPassword(passInput.value);
        }
      }, 200);
    } catch (e) {
    }
  }, []);

  useEffect(() => {
    // Only fetch when the user is authenticated and actually looking at agents.
    if (isLoggedIn && currentView === 'agents') {
      fetchAgents();
    }
  }, [isLoggedIn, currentView]);

  // Authentication helpers --------------------------------------------------
  const handleLogin = async () => {
  setError('');
  setSuccess('');

  try {
    const bodyToSend = { email: loginEmail, password: (loginPassword || '').trim() };

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyToSend),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      window.localStorage.setItem('token', data.token);
      setToken(data.token);

      setSuccess('Login successful!');

      setTimeout(() => {
        setIsLoggedIn(true);
      }, 150);

      setLoginEmail('');
      setLoginPassword('');
    } else {
      setError(`Login failed (${response.status}): ${data.message || 'Unknown error'}`);
      console.error('❌ Login error:', data);
    }
  } catch (err) {
    console.error('🚨 Connection error:', err);
    setError(`Connection error: ${err.message}. Please check if the server is running at ${API_URL}`);
  }
};

  const handleLogout = () => {
    // Full reset so stale lists don't flash when another admin logs in.
    window.localStorage.removeItem('token');
    setToken('');
    setIsLoggedIn(false);
    setAgents([]);
    setDistribution([]);
  };

  // Data fetching helpers ---------------------------------------------------
  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/agents`, {
        headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (err) {
      setError('Failed to fetch agents');
    }
    setLoading(false);
  };

  // Agent CRUD keeps things simple for the assignment.
  const handleCreateAgent = async () => {
    setError('');
    setSuccess('');

    if (!agentName || !agentEmail || !agentMobile || !agentPassword) {
      setError('All fields are required');
      return;
    }

    const formData = {
      name: agentName,
      email: agentEmail,
      mobile: agentMobile,
      password: agentPassword,
    };

    try {
      const response = await fetch(`${API_URL}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Agent created successfully!');
        fetchAgents();
        setAgentName('');
        setAgentEmail('');
        setAgentMobile('');
        setAgentPassword('');
      } else {
        setError(data.message || 'Failed to create agent');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleDeleteAgent = async (id) => {
    // Confirm client-side to avoid accidental deletions.
    if (!window.confirm('Are you sure you want to delete this agent?')) return;

    try {
      const response = await fetch(`${API_URL}/agents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Agent deleted successfully!');
        fetchAgents();
      } else {
        setError(data.message || 'Failed to delete agent');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  // Upload + distribution flow ------------------------------------------------
  const handleFileUpload = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!selectedFile) {
      setError('Please select a file');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_URL}/upload/customers`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Successfully distributed ${data.totalCustomers} customers among ${data.totalAgents} agents!`);
        setSelectedFile(null);
        fetchDistribution();
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      setError('Connection error');
    }
    setLoading(false);
  };

  const fetchDistribution = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/upload/distribution`, {
        headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setDistribution(data.distribution);
        setCurrentView('distribution');
      }
    } catch (err) {
      setError('Failed to fetch distribution');
    }
    setLoading(false);
  };

  const fetchDistributionHistory = async (opts = {}) => {
    setLoading(true);
    setError('');
    try {
      const qs = [];
      if (opts.startDate) qs.push(`startDate=${encodeURIComponent(opts.startDate)}`);
      if (opts.endDate) qs.push(`endDate=${encodeURIComponent(opts.endDate)}`);
      if (opts.filename) qs.push(`filename=${encodeURIComponent(opts.filename)}`);
      if (opts.agentId) qs.push(`agentId=${encodeURIComponent(opts.agentId)}`);
      const query = qs.length ? `?${qs.join('&')}` : '';

      const response = await fetch(`${API_URL}/distributions${query}`, {
        headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setDistHistory(data.results || []);
        setCurrentView('history');
      } else {
        setError(data.message || 'Failed to fetch distribution history');
      }
    } catch (err) {
      setError('Connection error');
    }
    setLoading(false);
  };

  const fetchDistributionDetail = async (id) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/distributions/${id}`, {
        headers: { 'Authorization': `Bearer ${token || localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setSelectedDistribution(data.distribution);
        setCurrentView('historyDetail');
      } else {
        setError(data.message || 'Failed to fetch distribution');
      }
    } catch (err) {
      setError('Connection error');
    }
    setLoading(false);
  };

  // Split the UI into the login screen vs the dashboard.
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Agent Management System</h1>
            <p className="text-gray-600 mt-2">Customer Management System</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="login-email"
                name="username"
                autoComplete="username"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@webgeon.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="login-password"
                name="current-password"
                autoComplete="current-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Login
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium mb-2">Testing Credentials (for testing purposes)</p>
            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="text-sm"><strong>Email:</strong> admin@webgeon.com</p>
              <p className="text-sm"><strong>Password:</strong> admin123</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">These credentials are provided for testing only.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Agent Management System Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-900">×</button>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
            <button onClick={() => setSuccess('')} className="ml-4 text-green-900">×</button>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setCurrentView('agents')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              currentView === 'agents'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Manage Agents
          </button>

          <button
            onClick={() => setCurrentView('upload')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              currentView === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-5 h-5" />
            Upload Customers
          </button>

          <button
            onClick={fetchDistribution}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              currentView === 'distribution'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Eye className="w-5 h-5" />
            View Distribution
          </button>

          <button
            onClick={() => fetchDistributionHistory()}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              currentView === 'history' || currentView === 'historyDetail'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Distribution History
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {currentView === 'agents' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Agent Management</h2>

              <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Create New Agent
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile (with country code)"
                    value={agentMobile}
                    onChange={(e) => setAgentMobile(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={agentPassword}
                    onChange={(e) => setAgentPassword(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleCreateAgent}
                    className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Agent
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  All Agents ({agents.length})
                </h3>
                {loading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : agents.length === 0 ? (
                  <p className="text-gray-500">No agents found. Create your first agent above.</p>
                ) : (
                  <div className="grid gap-4">
                    {agents.map((agent) => (
                      <div key={agent._id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-800">{agent.name}</h4>
                          <p className="text-sm text-gray-600">{agent.email}</p>
                          <p className="text-sm text-gray-600">{agent.mobile}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Customers: {agent.assignedCustomers?.length || 0}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteAgent(agent._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Agent"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === 'upload' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Upload Customer List</h2>

              <div className="max-w-xl">
                <div className="mb-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <p className="font-medium mb-2">File Requirements:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Accepted formats: CSV, XLS, XLSX</li>
                    <li>Required columns: FirstName, Phone</li>
                    <li>Optional column: Notes</li>
                    <li>Customers will be distributed equally among active agents</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Customer File
                    </label>
                    <input
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleFileUpload}
                    disabled={loading || !selectedFile}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-medium"
                  >
                    {loading ? 'Processing...' : 'Upload and Distribute'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'distribution' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Customer Distribution</h2>

              {loading ? (
                <p className="text-gray-500">Loading distribution...</p>
              ) : distribution.length === 0 ? (
                <p className="text-gray-500">No customer data available. Upload a customer list first.</p>
              ) : (
                <div className="space-y-6">
                  {distribution.map((agent) => (
                    <div key={agent.agentId} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{agent.agentName}</h3>
                          <p className="text-sm text-gray-600">{agent.agentEmail}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{agent.totalCustomers}</p>
                          <p className="text-sm text-gray-500">Customers</p>
                        </div>
                      </div>

                      {agent.customers && agent.customers.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Customers:</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {agent.customers.slice(0, 5).map((customer, idx) => (
                              <div key={idx} className="p-3 bg-gray-50 rounded text-sm">
                                <p className="font-medium text-gray-800">{customer.FirstName}</p>
                                <p className="text-gray-600">{customer.Phone}</p>
                                {customer.Notes && (
                                  <p className="text-gray-500 text-xs mt-1">{customer.Notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                          {agent.customers.length > 5 && (
                            <p className="text-xs text-gray-500 mt-2">
                              +{agent.customers.length - 5} more customers
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'history' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Distribution History</h2>

              {loading ? (
                <p className="text-gray-500">Loading history...</p>
              ) : distHistory.length === 0 ? (
                <p className="text-gray-500">No distribution history found.</p>
              ) : (
                <div className="space-y-4">
                  {distHistory.map((d) => (
                    <div key={d.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-800">{d.filename || 'Unnamed upload'}</div>
                        <div className="text-sm text-gray-600">{new Date(d.uploadedAt).toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Total customers: {d.totalCustomers}</div>
                        {d.uploadedBy && d.uploadedBy.email && (
                          <div className="text-xs text-gray-500">Uploaded by: {d.uploadedBy.email}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchDistributionDetail(d.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'historyDetail' && selectedDistribution && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Distribution Detail</h2>
                <div>
                  <button onClick={() => { setSelectedDistribution(null); fetchDistributionHistory(); }} className="px-3 py-2 bg-gray-100 rounded mr-2">Back</button>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600">File: <span className="font-medium text-gray-800">{selectedDistribution.filename}</span></div>
                <div className="text-sm text-gray-600">Uploaded At: <span className="font-medium">{new Date(selectedDistribution.uploadedAt).toLocaleString()}</span></div>
                {selectedDistribution.uploadedBy && (
                  <div className="text-sm text-gray-600">Uploaded By: <span className="font-medium">{selectedDistribution.uploadedBy.email}</span></div>
                )}
              </div>

              <div className="space-y-6">
                {selectedDistribution.assignments.map((a, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-gray-800">{a.agent && a.agent.name ? a.agent.name : (a.agent && a.agent.id ? a.agent.id : 'Agent')}</div>
                        <div className="text-sm text-gray-600">Assigned: {a.count}</div>
                      </div>
                    </div>

                    {a.customers && a.customers.length > 0 ? (
                      <div className="space-y-2 max-h-72 overflow-y-auto mt-2">
                        {a.customers.map((c, i) => (
                          <div key={i} className="p-2 bg-gray-50 rounded">
                            <div className="font-medium text-gray-800">{c.FirstName || '—'}</div>
                            <div className="text-sm text-gray-600">{c.Phone || '—'}</div>
                            {c.Notes && <div className="text-xs text-gray-500 mt-1">{c.Notes}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No customers assigned.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;