![predict_word_logo](https://i.imgur.com/QvZHBwV.png)

# 🧠 Transformer Language Model Training with Tinygrad

A comprehensive implementation of a GPT-style transformer from scratch using [Tinygrad](https://github.com/tinygrad/tinygrad). This  project demonstrates how language models learn to predict the next word in sequences, the fundamental task that enables language understanding and generation.

## 🎯 What You'll Learn

This implementation teaches the core concepts behind modern language models like GPT, BERT, and T5:

- **🧠 How Language Models Work**: Learn how models convert words into high-dimensional vectors and use transformer architecture to understand relationships like "king/queen" and "Paris/France ↔ Tokyo/Japan"

- **🔍 Self-Attention Mechanism**: Understand how each word creates Query, Key, and Value representations to dynamically focus on relevant context

- **🏗️ Transformer Architecture**: Complete decoder-only implementation with multi-head attention, feed-forward networks, and residual connections

- **📈 Training Process**: See how models learn statistical patterns through gradient descent and backpropagation

## 🚀 Quick Start

### Prerequisites

Make sure you have Python 3.8+ installed, then install the required dependencies:

```bash
# Install tinygrad (the minimalist deep learning framework)
pip install tinygrad

# Optional: For better performance with GPU support
pip install tinygrad[gpu]

# Additional dependencies
pip install numpy
```

### Installation

1. **Clone or download the code**:
   ```bash
   # If you have the file locally
   # Just ensure train_next_word_prediction.py is in your directory
   ```

2. **Verify tinygrad installation**:
   ```bash
   python -c "from tinygrad.tensor import Tensor; print('Tinygrad installed successfully!')"
   ```

### Running the Example

1. **Basic execution** (recommended for first run):
   ```bash
   python train_next_word_prediction.py
   ```

2. **With detailed educational output**:
   ```bash
   python train_next_word_prediction.py 2>&1 | tee training_log.txt
   ```

## 📊 Expected Output

When you run the script, you'll see:

```
================================================================================
🧠 TRANSFORMER LANGUAGE MODEL TRAINING WITH TINYGRAD
================================================================================
This demo shows how transformers learn to predict the next word in sequences,
the fundamental task that enables language understanding and generation.

🧠 Initializing GPT-style transformer:
   📚 Vocabulary: 52 tokens
   🎯 Embedding size: 32 dimensions
   🏗️ Architecture: 2 layers, 4 attention heads

📝 Generated training data:
   📊 Input shape: (8, 16)
   🎯 Target shape: (8, 16)
   📈 Total parameters to learn: 14

🚀 Starting training for 30 epochs...
   📈 Epoch   0 | Loss: 3.9512
   📈 Epoch   5 | Loss: 3.7234
   📈 Epoch  10 | Loss: 3.4156
   ...
   
✅ Training completed! Final loss: 2.8945
```

## 🎛️ Customization Options

### Modify Model Architecture

Edit the hyperparameters in the `train_next_word_predictor()` function:

```python
# Model size configuration
vocabulary_size = 52        # Number of unique tokens
embedding_dimension = 32    # Size of word vectors (try 64, 128, 256)
num_attention_heads = 4     # Parallel attention mechanisms (must divide embedding_dimension)
num_transformer_layers = 2  # Model depth (try 4, 6, 12 for larger models)

# Training configuration  
batch_size = 8              # Sequences per batch (try 16, 32)
num_training_epochs = 30    # Training iterations (try 100, 500)
learning_rate = 5e-3        # Optimization step size (try 1e-3, 1e-4)
```

### GPU Acceleration

For faster training on compatible hardware:

```python
# In the model initialization, tinygrad will automatically use GPU if available
# No code changes needed - tinygrad handles device placement automatically
```

### Real Text Data

To train on actual text instead of synthetic data:

```python
# Replace the synthetic data generation with real tokenized text:
# input_sequences = load_and_tokenize_your_text_data()
# target_sequences = shift_sequences_by_one_position(input_sequences)
```

## 🔧 Troubleshooting

### Common Issues

1. **ImportError: No module named 'tinygrad'**
   ```bash
   pip install tinygrad
   ```

2. **GPU/CUDA errors**
   ```bash
   # Fall back to CPU-only mode
   pip install tinygrad --no-deps
   ```

3. **Memory errors with larger models**
   - Reduce `batch_size` 
   - Reduce `embedding_dimension`
   - Reduce `num_transformer_layers`

4. **Loss not decreasing**
   - Try different `learning_rate` values (1e-4, 1e-3, 1e-2)
   - Increase `num_training_epochs`
   - Check that synthetic data has patterns to learn

### Performance Tips

- **Start small**: Begin with default parameters to verify everything works
- **Scale gradually**: Increase model size incrementally 
- **Monitor training**: Watch loss curves to ensure learning is happening
- **Use validation data**: In real projects, always use held-out validation sets

## 📚 Understanding the Code

### Core Components

1. **`LearnedPositionalEmbeddings`**: Adds position information to word embeddings
2. **`MultiHeadSelfAttention`**: The core attention mechanism with causal masking
3. **`PositionWiseFeedForward`**: Deep processing layers between attention blocks
4. **`TransformerDecoderBlock`**: Complete transformer layer with residual connections
5. **`GPTStyleTransformer`**: Full model combining all components
6. **`train_next_word_predictor()`**: Complete training loop with optimization

### Key Concepts Demonstrated

- **Self-Attention**: How words attend to each other for context
- **Causal Masking**: Preventing future information leakage in autoregressive models
- **Residual Connections**: Enabling deep network training
- **Layer Normalization**: Stabilizing training dynamics
- **Autoregressive Generation**: Creating text one token at a time

## 🎓 Educational Extensions

### Experiment Ideas

1. **Visualize Attention**: Add attention weight plotting
2. **Real Data**: Train on Shakespeare, Wikipedia, or other text corpora
3. **Architecture Variants**: Try different numbers of heads, layers, dimensions
4. **Training Techniques**: Implement learning rate scheduling, gradient clipping
5. **Evaluation Metrics**: Add perplexity calculation and text quality metrics

### Advanced Features to Add

- **Gradient Accumulation**: Simulate larger batch sizes
- **Mixed Precision**: Use FP16 for memory efficiency  
- **Checkpointing**: Save and resume training
- **Validation Tracking**: Monitor overfitting
- **Text Preprocessing**: Real tokenization with BPE/WordPiece

## 📖 Learning Resources

### Essential Reading
- [Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/) - Visual guide to transformer architecture
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) - Original transformer paper
- [GPT Paper](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf) - Decoder-only architecture

### Tutorials & Courses
- [Hugging Face Course](https://huggingface.co/learn) - Practical transformer applications
- [OpenAI Cookbook](https://cookbook.openai.com) - Advanced techniques and recipes
- [Building Transformers Guide](https://www.datacamp.com/tutorial/building-a-transformer-with-py-torch) - Step-by-step implementation
- [PyTorch Learning](https://www.learnpytorch.io/pytorch_cheatsheet/) - Deep learning fundamentals

### Code Examples
- [LLM Training Example](https://github.com/vtempest/ai-research-agent/blob/master/packages/neural-net/src/train/predict-next-word.js) - JavaScript implementation
- [Tinygrad Documentation](https://docs.tinygrad.org/) - Framework-specific guides

## 🤝 Contributing

Feel free to:
- Add visualization tools for attention weights
- Implement additional training techniques
- Create examples with real text datasets
- Add performance benchmarks
- Improve documentation and comments
