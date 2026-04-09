import React from 'react';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children, activePage }) => {
  return (
    <div style={styles.dashboard}>
      <Header activePage={activePage} />
      <main style={styles.dashboardContent}>
        <div style={styles.contentContainer}>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

// Inline CSS Styles
const styles = {
  dashboard: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  dashboardContent: {
    flex: 1,
    padding: '30px 0',
    minHeight: 'calc(100vh - 200px)',
    backgroundColor: '#f8fafc',
    position: 'relative'
  },
  contentContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px',
    width: '100%'
  }
};

export default Layout;