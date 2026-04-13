import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiFetch, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './ManagerCourts.css';

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
      
      const courtsData = await apiFetch('/courts/manager/all');
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
      await fetchManagerCourts(); // Refresh the courts list
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
      await fetchManagerCourts();
      if (courts.length > 1) {
        setSelectedCourt(courts[0]);
      } else {
        setSelectedCourt(null);
      }
    } catch (error) {
      alert('Delete failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading Courts...</p>
    </div>
  );

  return (
    <Layout activePage="managerCourts">
      <div className="manager-courts-page">
        <div className="court-selector">
          <div className="selector-group">
            <span className="selector-label">Select Court</span>
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
            <div className={`court-status-badge ${selectedCourt.status === 'open' ? 'status-open' : 'status-closed'}`}>
              <span className="status-dot"></span>
              {selectedCourt.status === 'open' ? 'Open for Booking' : 'Closed'}
            </div>
          )}
          
          <button className="create-court-btn" onClick={handleCreateCourt}>
            + Create New Court
          </button>
        </div>

        {selectedCourt ? (
          <div className="court-details-card">
            <div className={`status-toggle-section ${selectedCourt.status === 'open' ? 'status-open-section' : 'status-closed-section'}`}>
              <div>
                <h4>Current Status</h4>
                <p>{selectedCourt.status === 'open' ? 'Court is open for bookings' : 'Court is currently closed'}</p>
              </div>
              <button 
                className={`toggle-status-btn ${selectedCourt.status === 'open' ? 'btn-close' : 'btn-open'}`}
                onClick={handleToggleStatus}
              >
                {selectedCourt.status === 'open' ? 'Close Court' : 'Open Court'}
              </button>
            </div>

            <div className="court-details-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Court Name</label>
                  <input 
                    type="text" 
                    value={selectedCourt.name || ''} 
                    onChange={(e) => setSelectedCourt({...selectedCourt, name: e.target.value})} 
                    placeholder="Enter court name"
                  />
                </div>
                <div className="form-group">
                  <label>Price per hour (Rs.)</label>
                  <input 
                    type="number" 
                    value={selectedCourt.pricePerHour || ''} 
                    onChange={(e) => setSelectedCourt({...selectedCourt, pricePerHour: parseInt(e.target.value)})} 
                    placeholder="Enter price"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Address</label>
                <input 
                  type="text" 
                  value={selectedCourt.location?.address || ''} 
                  onChange={(e) => setSelectedCourt({...selectedCourt, location: {...selectedCourt.location, address: e.target.value}})} 
                  placeholder="Enter court address"
                />
              </div>
              
              <div className="form-actions">
                <button className="save-btn" onClick={handleGeneralUpdate}>Save Changes</button>
                <button className="delete-btn" onClick={handleDeleteCourt}>Delete Court</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <p>No courts available</p>
            <p className="empty-subtext">Create your first court to get started</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ManagerCourts;