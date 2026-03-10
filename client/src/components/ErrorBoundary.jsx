/**
 * Catches React render errors and shows a fallback UI instead of a blank screen.
 */

import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="theme-bg min-vh-100 d-flex align-items-center justify-content-center p-3">
          <div className="text-center" style={{ maxWidth: 400 }}>
            <h1 className="h5 theme-text mb-2">Something went wrong</h1>
            <p className="text-muted small mb-3">
              The app hit an error. Try refreshing or going back to the dashboard.
            </p>
            <Link to="/" className="btn btn-theme-primary me-2">Dashboard</Link>
            <button
              type="button"
              className="btn theme-card border-theme"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
