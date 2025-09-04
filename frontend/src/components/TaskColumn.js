import React, { useState } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import TaskCard from './TaskCard';
import { FiPlus } from 'react-icons/fi';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

const TaskColumn = ({ day, tasks, setTasks }) => {
    const [newTaskText, setNewTaskText] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const completedCount = tasks.filter(t => t.completed).length;

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        try {
            const { data: newTask } = await apiClient.post('/tasks', {
                text: newTaskText,
                day,
            });
            setTasks(prev => ({
                ...prev,
                [day]: [...prev[day], newTask]
            }));
            setNewTaskText('');
            setIsAdding(false);
            toast.success('Task added!');
        } catch (error) {
            toast.error('Failed to add task.');
        }
    };

    return (
        <div className="bg-gray-50 rounded-lg p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-text-primary">{day}</h3>
                <span className="text-sm font-medium text-text-secondary bg-gray-200 px-2 py-1 rounded-full">{completedCount}/{tasks.length}</span>
            </div>
            <Droppable droppableId={day}>
                {(provided, snapshot) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-grow min-h-[200px] rounded-md transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
                    >
                        {tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="mb-3"
                                    >
                                        <TaskCard task={task} setTasks={setTasks} isDragging={snapshot.isDragging} />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
            {isAdding ? (
                <form onSubmit={handleAddTask} className="mt-auto">
                    <textarea
                        autoFocus
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        placeholder="Enter a new task..."
                        className="w-full p-2 border border-border-color rounded-md resize-none focus:ring-2 focus:ring-primary focus:outline-none"
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddTask(e);
                           }
                           if (e.key === 'Escape') {
                                setIsAdding(false);
                                setNewTaskText('');
                           }
                        }}
                    />
                    <div className="flex items-center justify-end mt-2 space-x-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1 text-sm rounded-md text-text-secondary hover:bg-gray-200">Cancel</button>
                        <button type="submit" className="px-3 py-1 text-sm rounded-md text-white bg-primary hover:bg-blue-600">Add</button>
                    </div>
                </form>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="mt-auto flex items-center justify-center w-full p-2 text-text-secondary hover:bg-gray-200 hover:text-text-primary rounded-md transition-colors"
                >
                    <FiPlus className="mr-2" /> Add a card
                </button>
            )}
        </div>
    );
};

export default TaskColumn;
