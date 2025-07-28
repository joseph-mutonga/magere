
# Kitengela Magereza S.S. - Backend API

This directory contains the Python Flask backend for the School Management System.

## Features

- RESTful API built with Flask and SQLAlchemy.
- JWT-based authentication for secure endpoints.
- Role-based access control (Principal, Secretary, Teacher).
- Full CRUD operations for Students, Teachers, Inventory, etc.
- SQLite database for easy setup.
- Automatic database seeding from frontend mock data on first run.

## Setup and Running the Server

### Prerequisites

- Python 3.7+
- `pip` (Python package installer)

### 1. Set up a Virtual Environment

It's highly recommended to use a virtual environment to manage project dependencies.

```bash
# Navigate to the root of the project (one level above this 'api' directory)
python -m venv venv
```

Activate the virtual environment:
- **macOS/Linux:** `source venv/bin/activate`
- **Windows:** `.\venv\Scripts\activate`

### 2. Install Dependencies

Install all the required Python packages using the `requirements.txt` file.

```bash
pip install -r requirements.txt
```

### 3. Run the Flask Server

The application uses the `.flaskenv` file to configure the environment. You can run the server with a simple command:

```bash
flask run --port=5001
```

The server will start on `http://127.0.0.1:5001`.

On the first run, the server will:
1. Create a `school.db` SQLite file inside this `api` directory.
2. Populate the database with the initial data from the frontend's mock data files.

### API Endpoints

The API is now running and ready to accept requests. The frontend can be configured to point to `http://127.0.0.1:5001` to use this live backend instead of mock data.

Example endpoints:
- `POST /api/login`
- `GET /api/students`
- `GET /api/inventory/requests`
- `PUT /api/inventory/requests/<id>/approve`
    