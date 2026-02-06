import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        // Log error to an error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle size={32} className="text-red-600" />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Something went wrong
                        </h2>

                        <p className="text-gray-600 mb-6">
                            We're sorry, but there was an error loading this content.
                            Please try again or return to the homepage.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-6 text-left bg-gray-100 p-4 rounded-lg">
                                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                                    Error Details
                                </summary>
                                <pre className="mt-2 text-xs text-red-600 overflow-auto">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-red text-white font-medium rounded-lg hover:bg-red-700 transition"
                            >
                                <RefreshCw size={18} />
                                Try Again
                            </button>

                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
                            >
                                <Home size={18} />
                                Go Home
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * ErrorFallback - Functional error display component
 * Use with react-error-boundary or standalone
 */
export const ErrorFallback = ({ error, resetErrorBoundary }) => {
    return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} className="text-red-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Oops! Something went wrong
                </h2>

                <p className="text-gray-600 mb-6">
                    {error?.message || 'An unexpected error occurred'}
                </p>

                <div className="flex gap-4 justify-center">
                    {resetErrorBoundary && (
                        <button
                            onClick={resetErrorBoundary}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-red text-white font-medium rounded-lg hover:bg-red-700 transition"
                        >
                            <RefreshCw size={18} />
                            Try Again
                        </button>
                    )}

                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
                    >
                        <Home size={18} />
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ErrorBoundary;
