import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getAuthToken } from '../../services/api';
import Layout from '../Layout';
// import './Tournaments.css';

const TournamentCreate = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    format: 'knockout',
    startDate: '',
    endDate: '',
    registrationDeadline: '',  // Added registration deadline
    venue: '',
    entryFee: '',
    maxTeams: 8,
    priceDistribution: {
      first: 0,
      second: 0,
      third: 0,
      total: 0
    },
    rulesDescription: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseInt(value) || 0;
    
    setFormData(prev => {
      const newDistribution = {
        ...prev.priceDistribution,
        [name]: numValue
      };
      newDistribution.total = newDistribution.first + newDistribution.second + newDistribution.third;
      
      return {
        ...prev,
        priceDistribution: newDistribution
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields (Name, Start Date, End Date)');
      return;
    }
    
    const token = getAuthToken();
    if (!token) {
      alert('Please login first');
      navigate('/login');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format data for backend
      const tournamentData = {
        name: formData.name,
        description: formData.description || 'No description provided',
        venue: formData.venue || 'FutsalPro Arena',
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        registrationDeadline: formData.registrationDeadline ? new Date(formData.registrationDeadline) : new Date(formData.startDate),
        format: formData.format,
        maxTeams: parseInt(formData.maxTeams),
        entryFee: parseInt(formData.entryFee) || 0,
        priceDistribution: {
          first: formData.priceDistribution.first,
          second: formData.priceDistribution.second,
          third: formData.priceDistribution.third,
          total: formData.priceDistribution.total
        },
        rulesDescription: formData.rulesDescription || 'Standard tournament rules apply.',
        status: 'registration_open'
      };
      
      console.log('Sending tournament data:', tournamentData);
      
      // Send to backend
      const response = await apiFetch('/tournaments', {
        method: 'POST',
        body: JSON.stringify(tournamentData)
      });
      
      console.log('Response:', response);
      
      if (response && response.success) {
        alert('Tournament created successfully!');
        navigate('/tournaments');
      } else {
        throw new Error(response?.message || 'Failed to create tournament');
      }
      
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert(error.message || 'Failed to create tournament. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  return (
    <Layout activePage="tournaments">
      <div className="tournament-create-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '30px' }}>
        <h1 style={{ fontSize: '32px', color: '#1e293b', marginBottom: '10px' }}>Create New Tournament</h1>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>Set up a tournament for teams to compete</p>

        <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
          {/* Basic Information Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>
              Basic Information
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                Tournament Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Futsal Champions Cup 2024"
                required
                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your tournament format, rules, etc..."
                rows="3"
                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', resize: 'vertical' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Tournament Format</label>
                <select 
                  name="format" 
                  value={formData.format} 
                  onChange={handleChange}
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
                >
                  <option value="knockout">🏆 Knockout</option>
                  <option value="league">📊 League</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Max Teams</label>
                <select 
                  name="maxTeams" 
                  value={formData.maxTeams} 
                  onChange={handleChange}
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
                >
                  <option value={4}>4 Teams</option>
                  <option value={8}>8 Teams</option>
                  <option value={16}>16 Teams</option>
                  <option value={32}>32 Teams</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schedule & Venue Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>
              Schedule & Venue
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                  Start Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                  End Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
                />
              </div>
            </div>
            
            {/* Registration Deadline Field - NEW */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                Registration Deadline <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
              />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
                Teams must register before this date to participate
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Venue / Location</label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="e.g., FutsalPro Arena, Kathmandu"
                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Prizes & Fees Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>
              Prizes & Fees
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Entry Fee (रु)</label>
                <input
                  type="number"
                  name="entryFee"
                  value={formData.entryFee}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Prize Distribution (रु)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '14px', color: '#64748b' }}>1st Place</label>
                  <input
                    type="number"
                    name="first"
                    value={formData.priceDistribution.first}
                    onChange={handlePriceChange}
                    placeholder="0"
                    min="0"
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '5px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', color: '#64748b' }}>2nd Place</label>
                  <input
                    type="number"
                    name="second"
                    value={formData.priceDistribution.second}
                    onChange={handlePriceChange}
                    placeholder="0"
                    min="0"
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '5px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', color: '#64748b' }}>3rd Place</label>
                  <input
                    type="number"
                    name="third"
                    value={formData.priceDistribution.third}
                    onChange={handlePriceChange}
                    placeholder="0"
                    min="0"
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '5px' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '15px', padding: '12px', background: '#f1f5f9', borderRadius: '8px', textAlign: 'center' }}>
                Total Prize Pool: <strong style={{ color: '#10b981', fontSize: '18px' }}>रु {formData.priceDistribution.total}</strong>
              </div>
            </div>
          </div>

          {/* Rules Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>
              Rules & Regulations
            </h3>
            
            <div>
              <textarea
                name="rulesDescription"
                value={formData.rulesDescription}
                onChange={handleChange}
                placeholder="Enter tournament rules, match format, player eligibility, etc..."
                rows="4"
                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '25px' }}>
            <button
              type="button"
              onClick={() => navigate('/tournaments')}
              style={{ padding: '12px 24px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '12px 24px', background: '#3b82f6', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', color: 'white', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Creating Tournament...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default TournamentCreate;