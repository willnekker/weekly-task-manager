import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';
import apiClient from './api/client';
import AuthForm from './components/AuthForm';
import TaskColumn from './components/TaskColumn';
import AdminPanel from './components/AdminPanel';
import ThemeToggle from './components/ThemeToggle'; // 1. Import the new component
import { FiLogOut, FiSettings } from 'react-icons/fi';
import { FaUserShield } from 'react-icons/fa';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const App = () => {
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState({});
    const [loading, setLoading] = useState(true);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

    const fetchUserData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const { data } = await apiClient.get('/me');
                setUser(data);
            } catch (error) {
                console.error("Session expired or invalid.", error);
                handleLogout();
            }
        }
        setLoading(false);
    }, []);

    const fetchTasks = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await apiClient.get('/tasks');
            const newTasks = days.reduce((acc, day) => {
                acc[day] = data.filter(task => task.day === day).sort((a, b) => a.position - b.position);
                return acc;
            }, {});
            setTasks(newTasks);
        } catch (error) {
            toast.error('Failed to fetch tasks.');
        }
    }, [user]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    useEffect(() => {
        if (user) {
            fetchTasks();
        }
    }, [user, fetchTasks]);

    const handleLogin = (userData, token) => {
        localStorage.setItem('token', token);
        setUser(userData.user);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setTasks({});
        setIsAdminPanelOpen(false);
        delete apiClient.defaults.headers.common['Authorization'];
        toast.success('Logged out successfully.');
    };

    const onDragEnd = async (result) => {
        const { source, destination } = result;
        if (!destination) return;

        const sourceDay = source.droppableId;
        const destDay = destination.droppableId;
        
        const startColumn = Array.from(tasks[sourceDay]);
        const [movedTask] = startColumn.splice(source.index, 1);
        
        const newTasksState = { ...tasks };
        
        if (sourceDay === destDay) {
            startColumn.splice(destination.index, 0, movedTask);
            newTasksState[sourceDay] = startColumn;
        } else {
            const endColumn = Array.from(tasks[destDay]);
            endColumn.splice(destination.index, 0, movedTask);
            newTasksState[sourceDay] = startColumn;
            newTasksState[destDay] = endColumn;
        }
        setTasks(newTasksState);

        const allAffectedTasks = [];
        Object.keys(newTasksState).forEach(day => {
            newTasksState[day].forEach((task, index) => {
                allAffectedTasks.push({ id: task.id, day: day, position: index });
            });
        });

        try {
            await apiClient.post('/tasks/reorder', { reorderedTasks: allAffectedTasks });
        } catch (error) {
            toast.error('Failed to save order. Reverting.');
            fetchTasks(); 
        }
    };
    
    if (loading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-background dark:bg-dark-background"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div></div>;
    }

    if (!user) {
        return <AuthForm onLogin={handleLogin} />;
    }

    return (
        // 2. Add dark mode classes to main elements
        <div className="min-h-screen bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary font-sans">
            <header className="bg-card-bg dark:bg-dark-card-bg border-b border-border-color dark:border-dark-border-color p-4 flex justify-between items-center">
                <div className="flex items-center">
                    <h1 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Hello, {user.username}! 👋</h1>
                    {user.is_admin ? <span className="ml-3 bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1"><FaUserShield/> Admin</span> : null}
                </div>
                {/* 3. Add the ThemeToggle button and dark mode hover styles */}
                <div className="flex items-center space-x-2">
                    <ThemeToggle />
                    {user.is_admin && (
                        <button onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                           <FiSettings className="text-text-secondary h-5 w-5" />
                        </button>
                    )}
                    <button onClick={handleLogout} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <FiLogOut className="text-text-secondary h-5 w-5" />
                    </button>
                </div>
            </header>
            
            {isAdminPanelOpen && <AdminPanel currentUser={user} />}
            
            <main className="p-4 sm:p-6 lg:p-8">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {days.map(day => (
                            <TaskColumn key={day} day={day} tasks={tasks[day] || []} setTasks={setTasks} />
                        ))}
                    </div>
                </DragDropContext>
            </main>
        </div>
    );
};

export default App;
