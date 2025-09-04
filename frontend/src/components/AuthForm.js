import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

const AuthForm = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [allowSignups, setAllowSignups] = useState(true);

    useEffect(() => {
        const checkSignupStatus = async () => {
            try {
                const { data } = await apiClient.get('/signup-status');
                setAllowSignups(data.allowSignups);
            } catch (error) {
                console.error("Could not check signup status");
                setAllowSignups(false); // Default to false on error
            }
        };
        checkSignupStatus();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const url = isLogin ? '/login' : '/signup';
        try {
            const { data } = await apiClient.post(url, { username, password });
            onLogin(data, data.token);
            toast.success(isLogin ? 'Logged in successfully!' : 'Account created successfully!');
        } catch (error) {
            const message = error.response?.data?.message || 'An error occurred.';
            const errors = error.response?.data?.errors;
            if (errors) {
                errors.forEach(err => toast.error(err.msg));
            } else {
                toast.error(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-full max-w-md p-8 space-y-8 bg-card-bg rounded-xl shadow-lg">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-text-primary">
                        {isLogin ? 'Sign in to your account' : 'Create a new account'}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border-color placeholder-text-secondary text-text-primary rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Username"
                            />
                        </div>
                        <div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border-color placeholder-text-secondary text-text-primary rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading || (!isLogin && !allowSignups)}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : (isLogin ? 'Sign in' : 'Create account')}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
    <button
        onClick={() => setIsLogin(!isLogin)}
        // This new logic only disables the button if we are on the Login page AND signups are off.
        disabled={isLogin && !allowSignups}
        // This new className makes the disabled link visually distinct.
        className={`font-medium transition-colors ${
            (isLogin && !allowSignups)
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-primary hover:text-blue-500'
        }`}
    >
        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
    </button>
    {/* This informational text now shows up when trying to access the disabled signup link */}
    {isLogin && !allowSignups && (
        <p className="text-xs text-text-secondary mt-2">Sign-ups are currently disabled by the administrator.</p>
    )}
</div>
            </div>
        </div>
    );
};

export default AuthForm;
