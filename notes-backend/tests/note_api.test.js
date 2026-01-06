const { test, after, beforeEach, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');
const helper = require('./test_helper');
const Note = require('../models/note');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { default: notes } = require('../../src/services/notes');
const note = require('../models/note');

const api = supertest(app);

describe('when there is initially some notes saved', () => {
  let token;
  let userId;

  beforeEach(async () => {
    await Note.deleteMany({});
    await User.deleteMany({});

    const passwordHash = await bcrypt.hash('testpassword', 10);
    const user = new User({
      username: 'testuser',
      name: 'Test User',
      passwordHash,
    });

    const savedUser = await user.save();
    userId = savedUser._id.toString();

    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'testuser', password: 'testpassword' });

    token = loginResponse.body.token;

    const notesWithUser = helper.initialNotes.map(note => ({
      ...note,
      user: userId,
    }));

    await Note.insertMany(notesWithUser);
  });

  test('notes are returned as json', async () => {
    console.log('entered test');
    await api
      .get('/api/notes')
      .expect(200)
      .expect('Content-Type', /application\/json/);
  });

  test('all notes are returned', async () => {
    const response = await api.get('/api/notes');

    assert.strictEqual(response.body.length, helper.initialNotes.length);
  });

  test('a specific note is within the returned notes', async () => {
    const response = await api.get('/api/notes');

    const contents = response.body.map(e => e.content);
    assert(contents.includes('HTML is easy'));
  });

  describe('viewing a specific note', () => {
    test('success with a valid id', async () => {
      const notesAtStart = await helper.notesInDb();
      const noteToView = notesAtStart[0];

      const resultNote = await api
        .get(`/api/notes/${noteToView.id}`)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      assert.strictEqual(resultNote.body.content, noteToView.content);
      assert.strictEqual(resultNote.body.important, noteToView.important);
      assert.strictEqual(resultNote.body.id, noteToView.id);
    });

    test('fails with status code 404 if note does not exist', async () => {
      const validNonexistingId = await helper.nonExistingId();

      await api.get(`/api/notes/${validNonexistingId}`).expect(404);
    });

    test('fails with status code 400 id is invalid', async () => {
      const invalidId = '5a3d5da59070081a82a3445';

      await api.get(`/api/notes/${invalidId}`).expect(400);
    });
  });

  describe('addition of a new note', () => {
    test('success with valid data and token', async () => {
      const newNote = {
        content: 'async/await simplifies making async calls',
        important: true,
        userId: '6944b9bdd294d71214a3384b',
      };

      await api
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(newNote)
        .expect(201)
        .expect('Content-Type', /application\/json/);

      const notesAtEnd = await helper.notesInDb();
      assert.strictEqual(notesAtEnd.length, helper.initialNotes.length + 1);

      const contents = notesAtEnd.map(r => r.content);

      assert(contents.includes('async/await simplifies making async calls'));
    });

    test('fails with status 401 if token is not provided', async () => {
      const newNote = {
        content: 'Note without token',
        important: true,
      };

      const result = await api.post('/api/notes').send(newNote).expect(401);

      assert(result.body.error.includes('token'));

      const notesAtEnd = await helper.notesInDb();
      assert.strictEqual(notesAtEnd.length, helper.initialNotes.length);
    });

    test('fails with status code 401 if token is invalid', async () => {
      const newNote = {
        content: 'Note without token',
        impotant: true,
      };

      await api
        .post('/api/notes')
        .set('Authotization', 'Bearer invalidtoken123')
        .send(newNote)
        .expect(401);

      const notesAtEnd = await helper.notesInDb();
      assert.strictEqual(notesAtEnd.length, helper.initialNotes.length);
    });

    test('fails with status code 400 if data is invalid', async () => {
      const newNote = {
        important: true,
      };

      await api
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(newNote)
        .expect(400);

      const notesAtEnd = await helper.notesInDb();

      assert.strictEqual(notesAtEnd.length, helper.initialNotes.length);
    });
  });

  describe('deletion of a note', () => {
    test('succeeds with status code 204 if id is valid', async () => {
      const notesAtStart = await helper.notesInDb();
      const noteToBeDeleted = notesAtStart[0];

      await api.delete(`/api/notes/${noteToBeDeleted.id}`).expect(204);

      const notesAtEnd = await helper.notesInDb();

      const contents = notesAtEnd.map(n => n.content);
      assert(!contents.includes(noteToBeDeleted.content));

      assert.strictEqual(notesAtEnd.length, helper.initialNotes.length - 1);
    });
  });

  describe('updating a note', () => {
    test('succeeds if id is valid', async () => {
      const notesAtStart = await helper.notesInDb();
      const noteToUpdate = notesAtStart[0];

      noteToUpdate.content = 'New Content';

      await api
        .put(`/api/notes/${noteToUpdate.id}`)
        .send(noteToUpdate)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      const notesAtEnd = await helper.notesInDb();
      assert.strictEqual(notesAtEnd.length, helper.initialNotes.length);

      const contents = notesAtEnd.map(n => n.content);
      assert(contents.includes('New Content'));
    });
  });
});

describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    await User.deleteMany();

    const passwordHash = await bcrypt.hash('sekret', 10);
    const user = new User({ username: 'root', passwordHash });

    await user.save();
  });

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: 'mluukkai',
      name: 'Matti Luukainen',
      password: 'salainen',
    };

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1);

    const usernames = usersAtEnd.map(u => u.username);
    assert(usernames.includes(newUser.username));
  });

  test('creation fails with proper status code and message if username is already taken', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: 'root',
      name: 'Superuser',
      password: 'salainen',
    };

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    const userAtEnd = await helper.usersInDb();
    assert(result.body.error.includes('expected `username` to be unique'));

    assert.strictEqual(userAtEnd.length, usersAtStart.length);
  });
});

after(async () => {
  await mongoose.connection.close();
});
