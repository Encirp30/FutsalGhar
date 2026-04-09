import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('user');
  
  useEffect(() => {
    const storedUser = localStorage.getItem('futsalUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUserRole(userData.role || 'user');
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const handleNavClick = (path) => {
    navigate(path);
  };

  // Get quick links based on role
  const getQuickLinks = () => {
    // Admin quick links
    if (userRole === 'admin') {
      return [
        { label: 'Admin Panel', path: '/admin-panel' },
        { label: 'Manager Dashboard', path: '/manager-dashboard' },
        { label: 'Courts', path: '/manager-courts' },
        { label: 'Teams', path: '/manager-teams' },
        { label: 'Players', path: '/manager-players' },
        { label: 'Profile', path: '/manager-profile' }
      ];
    }
    
    // Manager quick links
    if (userRole === 'manager') {
      return [
        { label: 'Dashboard', path: '/manager-dashboard' },
        { label: 'My Courts', path: '/manager-courts' },
        { label: 'Teams', path: '/manager-teams' },
        { label: 'Players', path: '/manager-players' },
        { label: 'Tournaments', path: '/tournaments' },
        { label: 'Matches', path: '/matches' },
        { label: 'Profile', path: '/manager-profile' }
      ];
    }
    
    // Player quick links - ADDED "Manage My Teams"
    return [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'My Bookings', path: '/my-bookings' },
      { label: 'Book Court', path: '/book-court' },
      { label: 'Teams', path: '/teams-list' },
      { label: 'Manage My Teams', path: '/manage-my-teams' },
      { label: 'Tournaments', path: '/tournaments' },
      { label: 'Matches', path: '/matches' },
      { label: 'Invite Friends', path: '/invite-friends' },
      { label: 'My Profile', path: '/profile' }
    ];
  };

  const quickLinks = getQuickLinks();

  return (
    <footer style={styles.dashboardFooter}>
      {/* Top Section */}
      <div style={styles.footerTop}>
        <div style={styles.footerBrand}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>⚽</div>
            <div>
              <h3 style={styles.brandName}>FutsalGhar</h3>
              <p style={styles.brandTagline}>Your Ultimate Futsal Experience</p>
            </div>
          </div>
          <p style={styles.brandDescription}>
            Book courts, create teams, and manage matches effortlessly. 
            The perfect platform for futsal enthusiasts.
          </p>
        </div>

        <div style={styles.footerSections}>
          {/* Quick Links */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Quick Links</h4>
            <ul style={styles.linkList}>
              {quickLinks.map((link, index) => (
                <li key={index} style={styles.listItem}>
                  <button 
                    onClick={() => handleNavClick(link.path)}
                    style={styles.footerLink}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#3b82f6';
                      e.target.style.transform = 'translateX(5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#cbd5e1';
                      e.target.style.transform = 'translateX(0)';
                    }}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Support</h4>
            <ul style={styles.linkList}>
              <li style={styles.listItem}>
                <button onClick={() => alert('Help Center coming soon!')} style={styles.footerLink}>Help Center</button>
              </li>
              <li style={styles.listItem}>
                <button onClick={() => alert('FAQ coming soon!')} style={styles.footerLink}>FAQ</button>
              </li>
              <li style={styles.listItem}>
                <button onClick={() => alert('Contact Us: support@futsalpro.com')} style={styles.footerLink}>Contact Us</button>
              </li>
              <li style={styles.listItem}>
                <button onClick={() => alert('Customer Support: +977 9800000000')} style={styles.footerLink}>Customer Support</button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Legal</h4>
            <ul style={styles.linkList}>
              <li style={styles.listItem}>
                <button onClick={() => alert('Terms of Service')} style={styles.footerLink}>Terms of Service</button>
              </li>
              <li style={styles.listItem}>
                <button onClick={() => alert('Privacy Policy')} style={styles.footerLink}>Privacy Policy</button>
              </li>
              <li style={styles.listItem}>
                <button onClick={() => alert('Cookie Policy')} style={styles.footerLink}>Cookie Policy</button>
              </li>
              <li style={styles.listItem}>
                <button onClick={() => alert('Refund Policy')} style={styles.footerLink}>Refund Policy</button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div style={styles.footerSection}>
            <h4 style={styles.sectionTitle}>Contact Us</h4>
            <div style={styles.contactInfo}>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>📍</span>
                <span>Kathmandu, Nepal</span>
              </div>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>📞</span>
                <span>+977 9800000000</span>
              </div>
              <div style={styles.contactItem}>
                <span style={styles.contactIcon}>✉️</span>
                <span>support@futsalpro.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media - Simplified */}
      <div style={styles.socialSection}>
        <h4 style={styles.socialTitle}>Follow Us</h4>
        <div style={styles.socialLinks}>
          <a 
            href="https://facebook.com" 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.socialLink}
            title="Facebook"
          >
            Facebook
          </a>
          <a 
            href="https://instagram.com" 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.socialLink}
            title="Instagram"
          >
            Instagram
          </a>
          <a 
            href="https://twitter.com" 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.socialLink}
            title="Twitter"
          >
            Twitter
          </a>
          <a 
            href="https://youtube.com" 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.socialLink}
            title="YouTube"
          >
            YouTube
          </a>
        </div>
      </div>

      {/* Bottom Section */}
      <div style={styles.footerBottom}>
        <p style={styles.copyright}>
          © 2024 FutsalGhar Management System. All rights reserved.
        </p>
        <div style={styles.bottomLinks}>
          <button onClick={() => alert('Sitemap')} style={styles.bottomLink}>Sitemap</button>
          <span style={styles.separator}>•</span>
          <button onClick={() => alert('Accessibility')} style={styles.bottomLink}>Accessibility</button>
          <span style={styles.separator}>•</span>
          <button onClick={() => alert('Careers')} style={styles.bottomLink}>Careers</button>
        </div>
      </div>
    </footer>
  );
};

// Inline CSS Styles - Fixed (removed invalid @media queries)
const styles = {
  dashboardFooter: {
    background: '#1e293b',
    color: '#cbd5e1',
    padding: '40px 30px 20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  footerTop: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '40px',
    marginBottom: '40px'
  },
  footerBrand: {
    paddingRight: '20px'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px'
  },
  logoIcon: {
    fontSize: '40px',
    background: '#3b82f6',
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white'
  },
  brandName: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 5px 0'
  },
  brandTagline: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  brandDescription: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#94a3b8',
    margin: 0
  },
  footerSections: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '30px'
  },
  footerSection: {
    minWidth: '0'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 20px 0',
    paddingBottom: '10px',
    borderBottom: '2px solid #3b82f6'
  },
  linkList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  listItem: {
    marginBottom: '12px'
  },
  footerLink: {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: '15px',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    padding: '2px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#94a3b8'
  },
  contactIcon: {
    fontSize: '16px'
  },
  socialSection: {
    textAlign: 'center',
    margin: '40px 0',
    padding: '25px 0',
    borderTop: '1px solid #334155',
    borderBottom: '1px solid #334155'
  },
  socialTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 20px 0'
  },
  socialLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    flexWrap: 'wrap'
  },
  socialLink: {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: '15px',
    transition: 'color 0.3s',
    padding: '8px 0'
  },
  footerBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    paddingTop: '20px'
  },
  copyright: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  bottomLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap'
  },
  bottomLink: {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'color 0.3s',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  separator: {
    color: '#64748b',
    fontSize: '12px'
  }
};

export default Footer;