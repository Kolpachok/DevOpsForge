import { useEffect, useState } from "react";

function App() {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    // Загружаем задачи при старте
    useEffect(() => {
        fetch("http://127.0.0.1:8000/tasks")
            .then((res) => res.json())
            .then((data) => setTasks(data));
    }, []);

    // Фильтрация задач по поиску
    const filterTasks = (taskList) => {
        const q = search.trim().toLowerCase();
        if (!q) return taskList;
        return taskList.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                t.assigned_to?.toLowerCase().includes(q)
        );
    };

    const todoTasks = filterTasks(tasks.filter(task => task.status === "todo"));
    const inProgressTasks = filterTasks(tasks.filter(task => task.status === "in_progress"));
    const doneTasks = filterTasks(tasks.filter(task => task.status === "done"));

    // Валидация + добавление задачи
    const addTask = async () => {
        if (!title.trim()) {
            setError("Заголовок задачи обязателен");
            return;
        }
        setError("");

        const newTask = {
            title,
            description: "Описание задачи",
            status: "todo",
            assigned_to: assignedTo.trim() || "Неизвестно"
        };

        const res = await fetch("http://127.0.0.1:8000/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newTask)
        });

        if (res.ok) {
            const savedTask = await res.json();
            setTasks([...tasks, savedTask]);
            setTitle("");
            setAssignedTo("");
        } else {
            console.error("Ошибка создания задачи", await res.json());
        }
    };

    // Удаление задачи
    const deleteTask = async (taskId) => {
        const res = await fetch(`http://127.0.0.1:8000/tasks/${taskId}`, {
            method: "DELETE"
        });
        if (res.ok) {
            setTasks(tasks.filter(t => t.id !== taskId));
        }
    };

    // Обновить статус задачи (перетаскивание между колонками)
    const updateTaskStatus = async (taskId, newStatus) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedTask = { ...task, status: newStatus };

        await fetch("http://127.0.0.1:8000/tasks/" + taskId, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedTask)
        });

        setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    };

    // Начало перетаскивания
    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    // Разрешить сброс в колонку
    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Сброс задачи в колонку
    const handleDrop = (e, targetStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");
        updateTaskStatus(taskId, targetStatus);
    };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", backgroundColor: "#f9f9f9" }}>
            <h1>Канбан‑доска задач</h1>

            {/* Поисковая строка */}
            <div
                style={{
                    marginBottom: "16px",
                    display: "flex",
                    gap: "10px",
                    alignItems: "center"
                }}
            >
                <input
                    type="text"
                    placeholder="Поиск задач..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        padding: "8px 12px",
                        flex: "1",
                        border: "1px solid #ccc",
                        borderRadius: "4px"
                    }}
                />
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        style={{
                            padding: "4px 8px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            background: "white",
                            cursor: "pointer"
                        }}
                    >
                        Сбросить
                    </button>
                )}
            </div>

            {/* Форма добавления задачи */}
            <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                    type="text"
                    placeholder="Название задачи"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{
                        padding: "8px",
                        borderRadius: "4px",
                        border: `1px solid ${error ? "#dc3545" : "#ccc"}`,
                        flex: "1"
                    }}
                    onKeyPress={(e) => {
                        if (e.key === "Enter") addTask();
                    }}
                />
                <input
                    type="text"
                    placeholder="Кому назначено"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    style={{
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        width: "150px"
                    }}
                    onKeyPress={(e) => {
                        if (e.key === "Enter") addTask();
                    }}
                />
                <button
                    onClick={addTask}
                    style={{
                        padding: "8px 16px",
                        borderRadius: "4px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        cursor: "pointer"
                    }}
                >
                    Добавить задачу
                </button>
            </div>
            {error && (
                <p style={{ color: "#dc3545", fontSize: "0.9em", marginBottom: "10px" }}>
                    {error}
                </p>
            )}

            <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
                {/* Колонка TODO */}
                <div
                    style={{
                        flex: "1",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "16px",
                        minHeight: "400px",
                        transition: "all 0.3s ease",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "todo")}
                >
                    <h2 style={{ marginBottom: "12px" }}> TODO </h2>
                    <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
                        {todoTasks.map(task => (
                            <li
                                key={task.id}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                style={{
                                    padding: "10px",
                                    margin: "6px 0",
                                    border: "1px solid #e0e0e0",
                                    borderRadius: "4px",
                                    cursor: "grab",
                                    transition: "all 0.2s ease",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                    display: "block"
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <div>
                                        <strong>{task.title}</strong> — {task.assigned_to}
                                    </div>
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "0.8em",
                                            borderRadius: "4px",
                                            border: "none",
                                            backgroundColor: "#dc3545",
                                            color: "white",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Колонка IN_PROGRESS */}
                <div
                    style={{
                        flex: "1",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "16px",
                        minHeight: "400px",
                        transition: "all 0.3s ease",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "in_progress")}
                >
                    <h2 style={{ marginBottom: "12px" }}> В работе </h2>
                    <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
                        {inProgressTasks.map(task => (
                            <li
                                key={task.id}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                style={{
                                    padding: "10px",
                                    margin: "6px 0",
                                    border: "1px solid #e0e0e0",
                                    borderRadius: "4px",
                                    cursor: "grab",
                                    transition: "all 0.2s ease",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                    display: "block"
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <div>
                                        <strong>{task.title}</strong> — {task.assigned_to}
                                    </div>
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "0.8em",
                                            borderRadius: "4px",
                                            border: "none",
                                            backgroundColor: "#dc3545",
                                            color: "white",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Колонка DONE */}
                <div
                    style={{
                        flex: "1",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "16px",
                        minHeight: "400px",
                        transition: "all 0.3s ease",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "done")}
                >
                    <h2 style={{ marginBottom: "12px" }}> Готово </h2>
                    <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
                        {doneTasks.map(task => (
                            <li
                                key={task.id}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                style={{
                                    padding: "10px",
                                    margin: "6px 0",
                                    border: "1px solid #e0e0e0",
                                    borderRadius: "4px",
                                    cursor: "grab",
                                    transition: "all 0.2s ease",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                    display: "block"
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <div>
                                        <strong>{task.title}</strong> — {task.assigned_to}
                                    </div>
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "0.8em",
                                            borderRadius: "4px",
                                            border: "none",
                                            backgroundColor: "#dc3545",
                                            color: "white",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default App;