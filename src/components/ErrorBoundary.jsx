import { Component } from 'react';
import { ERR } from '../lib/messages';
import { LogoMark } from './Logo';
import { btn } from './ui';

// Catches a crash while drawing a page, so the landlord never sees a blank white screen.
export default class ErrorBoundary extends Component {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error(error);
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-surface p-6 text-center">
        <div>
          <LogoMark className="mx-auto mb-5 h-12 w-12" />
          <h1 className="text-2xl font-bold text-ink-900">{ERR.crashed}</h1>
          <button className={`${btn} mt-5`} onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
