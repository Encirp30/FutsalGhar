import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getAuthToken } from '../../services/api';
import Layout from '../Layout';
import './TournamentCreate.css';

const TournamentCreate = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    format: 'knockout',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
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
      
      const response = await apiFetch('/tournaments', {
        method: 'POST',
        body: JSON.stringify(tournamentData)
      });
      
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
      <div className="tournament-create-page">
        <div className="page-header">
          <h1 className="page-title">Create New Tournament</h1>
          <p className="page-subtitle">Set up a tournament for teams to compete</p>
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          {/* Basic Information Section */}
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            
            <div className="form-group">
              <label>Tournament Name <span className="required">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Futsal Champions Cup 2024"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your tournament format, rules, etc..."
                rows="3"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Tournament Format</label>
                <select name="format" value={formData.format} onChange={handleChange}>
                  <option value="knockout">Knockout</option>
                  <option value="league">League</option>
                </select>
              </div>
              <div className="form-group">
                <label>Max Teams</label>
                <select name="maxTeams" value={formData.maxTeams} onChange={handleChange}>
                  <option value={4}>4 Teams</option>
                  <option value={8}>8 Teams</option>
                  <option value={16}>16 Teams</option>
                  <option value={32}>32 Teams</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schedule & Venue Section */}
          <div className="form-section">
            <h3 className="section-title">Schedule & Venue</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Date <span className="required">*</span></label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date <span className="required">*</span></label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Registration Deadline <span className="required">*</span></label>
              <input
                type="date"
                name="registrationDeadline"
                value={formData.registrationDeadline}
                onChange={handleChange}
                required
              />
              <p className="field-note">Teams must register before this date to participate</p>
            </div>
            
            <div className="form-group">
              <label>Venue / Location</label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="e.g., FutsalPro Arena, Kathmandu"
              />
            </div>
          </div>

          {/* Prizes & Fees Section */}
          <div className="form-section">
            <h3 className="section-title">Prizes & Fees</h3>
            
            <div className="form-group">
              <label>Entry Fee (Rs.)</label>
              <input
                type="number"
                name="entryFee"
                value={formData.entryFee}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </div>
            
            <div className="form-group">
              <label>Prize Distribution (Rs.)</label>
              <div className="prize-grid">
                <div className="prize-input">
                  <label className="prize-label">1st Place</label>
                  <input
                    type="number"
                    name="first"
                    value={formData.priceDistribution.first}
                    onChange={handlePriceChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="prize-input">
                  <label className="prize-label">2nd Place</label>
                  <input
                    type="number"
                    name="second"
                    value={formData.priceDistribution.second}
                    onChange={handlePriceChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="prize-input">
                  <label className="prize-label">3rd Place</label>
                  <input
                    type="number"
                    name="third"
                    value={formData.priceDistribution.third}
                    onChange={handlePriceChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <div className="total-prize">
                Total Prize Pool: <strong>Rs. {formData.priceDistribution.total.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Rules Section */}
          <div className="form-section">
            <h3 className="section-title">Rules & Regulations</h3>
            
            <div className="form-group">
              <textarea
                name="rulesDescription"
                value={formData.rulesDescription}
                onChange={handleChange}
                placeholder="Enter tournament rules, match format, player eligibility, etc..."
                rows="4"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => navigate('/tournaments')}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Tournament...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default TournamentCreate;