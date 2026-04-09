import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './ManagerDashboard.css';

const ManagerCourts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [courts, setCourts] = useState([]);

  const fetchManagerCourts = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        navigate('/login');
        return;
      }
      
      const courtsData = await api.getCourts();
      const managerCourts = (courtsData.data || []);
      setCourts(managerCourts);
      
      if (managerCourts.length > 0 && !selectedCourt) {
        setSelectedCourt(managerCourts[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching courts:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerCourts();
  }, [navigate]);

  const handleCreateCourt = async () => {
    const newCourtData = {
      name: `New Court ${courts.length + 1}`,
      type: "indoor",
      pricePerHour: 1000,
      description: "Standard Futsal Court",
      status: "closed",
      location: {
        address: "Enter Address",
        city: "Enter City"
      }
    };

    try {
      setLoading(true);
      await api.createCourt(newCourtData);
      await fetchManagerCourts();
      alert('Court Created successfully!');
    } catch (error) {
      alert('Creation failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedCourt) return;
    const newStatus = selectedCourt.status === 'open' ? 'closed' : 'open';
    
    try {
      // ONLY send the status update to avoid accidental data loss
      await api.updateCourt(selectedCourt._id, { status: newStatus });

      const updatedCourt = { ...selectedCourt, status: newStatus };
      setSelectedCourt(updatedCourt);
      setCourts(courts.map(c => c._id === selectedCourt._id ? updatedCourt : c));
    } catch (error) {
      alert('Failed to change status: ' + error.message);
    }
  };

  const handleGeneralUpdate = async () => {
    try {
      await api.updateCourt(selectedCourt._id, selectedCourt);
      alert('Changes saved successfully!');
      navigate('/manager-dashboard'); // Redirect to dashboard after saving
    } catch (error) {
      alert('Update failed: ' + error.message);
    }
  };

  const handleDeleteCourt = async () => {
    if (!selectedCourt) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedCourt.name}"? This cannot be undone.`)) return;

    try {
      setLoading(true);
      await api.deleteCourt(selectedCourt._id);
      alert('Court deleted successfully.');
      window.location.reload(); // Refresh to update list
    } catch (error) {
      alert('Delete failed: ' + error.message);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

  return (
    <Layout activePage="managerCourts">
      <div className="manager-dashboard">
        <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="manager-title">Court Management</h1>
            <p className="manager-subtitle">Manage availability and details</p>
          </div>
          <button className="save-btn" onClick={handleCreateCourt} style={{ backgroundColor: '#10b981' }}>
            + Create New Court
          </button>
        </div>

        <div className="court-selector">
          <div className="selector-group">
            <span className="selector-label">Select Court:</span>
            <select 
              className="court-select"
              value={selectedCourt?._id || ''}
              onChange={(e) => setSelectedCourt(courts.find(c => c._id === e.target.value))}
            >
              {courts.map(court => (
                <option key={court._id} value={court._id}>{court.name}</option>
              ))}
            </select>
          </div>
          
          {selectedCourt && (
            <div className={`status-pill ${selectedCourt.status}`}>
              {selectedCourt.status === 'open' ? '● LIVE' : '○ CLOSED'}
            </div>
          )}
        </div>

        {selectedCourt ? (
          <div className="tab-content">
            <div className="status-toggle-section" style={{ 
                padding: '20px', 
                backgroundColor: selectedCourt.status === 'open' ? '#ecfdf5' : '#fef2f2',
                borderRadius: '8px', marginBottom: '20px', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
                border: `1px solid ${selectedCourt.status === 'open' ? '#10b981' : '#ef4444'}`
            }}>
                <div>
                    <h4 style={{ margin: 0 }}>Current Status: {selectedCourt.status.toUpperCase()}</h4>
                </div>
                <button 
                    onClick={handleToggleStatus}
                    style={{
                        padding: '10px 20px', borderRadius: '6px', border: 'none',
                        color: 'white', fontWeight: 'bold', cursor: 'pointer',
                        backgroundColor: selectedCourt.status === 'open' ? '#ef4444' : '#10b981'
                    }}
                >
                    {selectedCourt.status === 'open' ? 'CLOSE FOR BOOKING' : 'OPEN FOR BOOKING'}
                </button>
            </div>

            <div className="court-details-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Court Name</label>
                  <input type="text" value={selectedCourt.name || ''} onChange={(e) => setSelectedCourt({...selectedCourt, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Price (Rs/hr)</label>
                  <input type="number" value={selectedCourt.pricePerHour || ''} onChange={(e) => setSelectedCourt({...selectedCourt, pricePerHour: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="form-group">
                  <label>Address</label>
                  <input type="text" value={selectedCourt.location?.address || ''} onChange={(e) => setSelectedCourt({...selectedCourt, location: {...selectedCourt.location, address: e.target.value}})} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button className="save-btn" onClick={handleGeneralUpdate}>Save Changes & Return</button>
                <button 
                  onClick={handleDeleteCourt}
                  style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Delete Court
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ManagerCourts;