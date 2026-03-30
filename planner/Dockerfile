# start from an official Python image
FROM python:3.11-slim

# set working directory inside the container
WORKDIR /app

# copy requirements first - Docker caches this layer
# so it only reinstalls packages if requirements.txt changes
COPY requirements.txt .

# install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# copy the rest of the code
COPY . .

# expose port 8000 for FastAPI
EXPOSE 8000

# start the server
CMD ["python3", "-m", "uvicorn", "api.server:app", "--host", "0.0.0.0", "--port", "8000"]