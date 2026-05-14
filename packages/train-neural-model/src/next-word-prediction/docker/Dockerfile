# 🧠 Transformer Language Model Training with Tinygrad - Docker Environment
#
# This Dockerfile creates a complete environment for running the transformer training example.
# It includes all dependencies, GPU support, and helpful development tools.
#
# Build: docker build -t transformer-tinygrad .
# Run:   docker run -it --rm transformer-tinygrad
# GPU:   docker run -it --rm --gpus all transformer-tinygrad

# Use Python 3.11 slim as base image for smaller size and faster builds
FROM python:3.11-slim

# Set maintainer and description
LABEL maintainer="Transformer Training Demo"
LABEL description="Complete environment for running GPT-style transformer training with Tinygrad"
LABEL version="1.0"

# Set environment variables for better Python behavior in containers
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Create a non-root user for security best practices
RUN groupadd -r transformer && useradd -r -g transformer transformer

# Update system packages and install essential system dependencies
RUN apt-get update && apt-get install -y \
    # Essential build tools
    build-essential \
    # Git for potential code updates
    git \
    # Curl for downloading files
    curl \
    # System utilities
    htop \
    vim \
    # GPU support dependencies (OpenCL/CUDA)
    ocl-icd-opencl-dev \
    # Clean up apt cache to reduce image size
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Create directories with proper permissions
RUN mkdir -p /app/logs /app/checkpoints /app/data \
    && chown -R transformer:transformer /app

# Copy requirements first for better Docker layer caching
COPY config/requirements.txt .

# Install Python dependencies
# Install tinygrad with all optional dependencies for maximum compatibility
RUN pip install --no-cache-dir \
    # Core tinygrad with GPU support
    tinygrad[gpu] \
    # Essential scientific computing
    numpy>=1.21.0 \
    # Optional: Jupyter for interactive exploration
    jupyter \
    notebook \
    # Optional: Visualization tools
    matplotlib \
    seaborn \
    # Optional: Progress bars and utilities
    tqdm \
    # Optional: Memory profiling
    psutil \
    # Development tools
    ipython \
    # Upgrade pip itself
    && pip install --upgrade pip

# Copy the transformer training code
COPY src/ ./src/
COPY README.md .

# Create a startup script that shows helpful information
COPY scripts/ ./scripts/
# Make startup script executable
RUN chmod +x /app/scripts/start.sh

# Make all scripts executable
RUN chmod +x /app/scripts/*.sh

# Change ownership of all files to the transformer user
RUN chown -R transformer:transformer /app

# Switch to non-root user
USER transformer

# Set default command to show startup information
CMD ["/app/scripts/start.sh"]

# Expose Jupyter port if needed
EXPOSE 8888

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "from tinygrad.tensor import Tensor; Tensor([1])" || exit 1

# Add labels for better container management
LABEL com.example.training-type="transformer"
LABEL com.example.framework="tinygrad"
LABEL com.example.gpu-support="optional"