const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('/api/todos', (req, res) => {
  let todos = db.getAll();

  if (req.query.completed === 'true') {
    todos = todos.filter((t) => t.completed);
  } else if (req.query.completed === 'false') {
    todos = todos.filter((t) => !t.completed);
  }

  todos = [...todos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(todos);
});

app.get('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const todo = db.getById(id);
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  res.json(todo);
});

app.post('/api/todos', (req, res) => {
  const { title, description } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const todo = db.create({
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() : '',
  });

  res.status(201).json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, description, completed } = req.body;

  if ('title' in req.body && (typeof title !== 'string' || !title.trim())) {
    return res.status(400).json({ error: 'Title must be a non-empty string' });
  }

  const updates = {};
  if ('title' in req.body) updates.title = title.trim();
  if ('description' in req.body) updates.description = description;
  if ('completed' in req.body) updates.completed = completed;

  const updated = db.update(id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.json(updated);
});

app.patch('/api/todos/:id/toggle', (req, res) => {
  const id = Number(req.params.id);
  const todo = db.getById(id);
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  const updated = db.update(id, { completed: !todo.completed });
  res.json(updated);
});

app.delete('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const deleted = db.remove(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  res.status(204).send();
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Todo API server running at http://localhost:${PORT}`);
});
