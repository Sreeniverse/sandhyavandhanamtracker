import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-extrabold font-syne text-ink mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-400 mb-6">{this.state.error.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="px-6 py-2.5 bg-ink text-white rounded-[10px] font-syne font-bold text-sm cursor-pointer hover:bg-[#222] transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
