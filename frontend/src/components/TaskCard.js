import React, { useState, useRef, useEffect } from 'react';
import { FiTrash2, FiEdit2 } from 'react-icons/fi'; // Ensure FiTrash2 is imported
import apiClient from '../api/client';
import toast from 'react-hot-toast';

const TaskCard = ({ task, setTasks, isDragging }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleUpdate = async (updates) => {
        try {
            const { data: updatedTask } = await apiClient.put(`/tasks/${task.id}`, updates);
            setTasks(prev => {
                const newTasks = { ...prev };
                for (const day in newTasks) {
                    newTasks[day] = newTasks[day].map(t => t.id === task.id ? updatedTask : t);
                }
                return newTasks;
            });
            return updatedTask;
        } catch (error) {
            toast.error("Failed to update task.");
        }
    };

    const handleToggleComplete = async () => {
        const promise = handleUpdate({ completed: !task.completed });
        toast.promise(promise, {
            loading: 'Updating...',
            success: `Task marked as ${!task.completed ? 'complete' : 'incomplete'}.`,
            error: 'Could not update.',
        });
    };

    // This is the new delete function
    const handleDelete = async () => {
        // Add a confirmation dialog as a safety measure
        if (window.confirm("Are you sure you want to delete this task?")) {
            try {
                await apiClient.delete(`/tasks/${task.id}`);
                // Optimistically update the UI by removing the task from the list
                setTasks(prev => {
                    const newTasks = { ...prev };
                    newTasks[task.day] = newTasks[task.day].filter(t => t.id !== task.id);
                    return newTasks;
                });
                toast.success("Task deleted.");
            } catch (error) {
                toast.error("Failed to delete task.");
            }
        }
    };

    const handleSaveEdit = async () => {
        if (editText.trim() === '' || editText === task.text) {
             setIsEditing(false);
             setEditText(task.text);
             return;
        }
        await handleUpdate({ text: editText });
        setIsEditing(false);
        toast.success("Task updated.");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSaveEdit();
        if (e.key === 'Escape') {
            setIsEditing(false);
            setEditText(task.text);
        }
    };

    return (
        <div className="bg-card-bg dark:bg-dark-card-bg p-3 rounded-lg border border-border-color dark:border-dark-border-color shadow-sm flex items-start space-x-3 transition-all group" isdragging={isDragging ? 'true' : 'false'}>
            <input 
                type="checkbox"
                checked={task.completed}
                onChange={handleToggleComplete}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <div className="flex-1">
                {isEditing ? (
                     <textarea
                        ref={inputRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full p-1 border border-primary rounded-md resize-none focus:outline-none bg-blue-50 dark:bg-gray-800 -m-1"
                     />
                ) : (
                    <p className={`text-text-primary dark:text-dark-text-primary text-sm ${task.completed ? 'line-through text-text-secondary dark:text-dark-text-secondary' : ''}`}>
                        {task.text}
                    </p>
                )}
            </div>
            {/* This div contains the edit and delete buttons, which appear on hover */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setIsEditing(true)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary">
                    <FiEdit2 size={14} />
                </button>
                <button onClick={handleDelete} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-text-secondary dark:text-dark-text-secondary hover:text-error dark:hover:text-error">
                    <FiTrash2 size={14} />
                </button>
            </div>
        </div>
    );
};

export default TaskCard;
