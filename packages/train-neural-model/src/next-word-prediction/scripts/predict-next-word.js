/**-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
            HERE BE DRAGONS! THOU ART FOREWARNED.
*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
                                                  .~))>>
                                                 .~)>>
                                               .~))))>>>
                                             .~))>>             ___
                                           .~))>>)))>>      .-~))>>
                                         .~)))))>>       .-~))>>)>
                                       .~)))>>))))>>  .-~)>>)>
                   )                 .~))>>))))>>  .-~)))))>>)>
                ( )@@*)             //)>))))))  .-~))))>>)>
              ).@(@@               //))>>))) .-~))>>)))))>>)>
            (( @.@).              //))))) .-~)>>)))))>>)>
          ))  )@@*.@@ )          //)>))) //))))))>>))))>>)>
       ((  ((@@@.@@             |/))))) //)))))>>)))>>)>
      )) @@*. )@@ )   (\_(\-\b  |))>)) //)))>>)))))))>>)>
    (( @@@(.@(@ .    _/`-`  ~|b |>))) //)>>)))))))>>)>
     )* @@@ )@*      @_  @_ /\b|))) //))))))>>))))>>
   (( @. )@( @ .   _/  /    /  \b)) //))>>)))))>>>_._
    )@@ (@@*)@@.  (6///6)- / ^  \b)//))))))>>)))>>   ~~-.
 (@vtempest  @@@.* VvvvvV//  ^  \b/)>>))))>>      _.     `b
  ((@@ @@@*.(@@ . - | o |' \ (  ^   \b)))>>        .'       b`,
   ((@@).*@@ )@ )   \^^^/  ((   ^  ~)_        \  /           b `,
     (@@. (@@ ).     `-'   (((   ^    `\ \ \ \ \|             b  `.
       (*.@*              / ((((        \| | |  \       .       b `.
                         / / (((((  \    \ /  _.-~\     Y,      b  ;
                        / / / (((((( \    \.-~   _.`" _.-~`,    b  ;
                       /   /   `(((((()    )    (((((~      `,  b  ;
                     _/  _/      `"""/   /'                  ; b   ;
                 _.-~_.-~           /  /'                _.'~bb _.'
               ((((~~              / /'              _.'~bb.--~
                                  ((((          __.-~bb.-~
                                              .'  b .~~
                                              :bb ,' 
                                              ~~*/


import { torch } from "../../neural-net-tensors/neural-net-gpu.js"

/**=======================================================================================
 * ### Predict Next Word Based On Vectors of Learned Context Patterns in Training Examples
 * =======================================================================================
 *
 * Comprehensive training function for a self-attention transformer using custom torch.js.
 * This function implements a decoder-only transformer architecture similar to GPT models,
 * training it with synthetic data using the Adam optimizer and GPU.js for acceleration.
 * In real applications, this would be:
 * - Tokenized text data (e.g., using BPE, WordPiece, or SentencePiece)
 * - Loaded from datasets like WikiText, BookCorpus, or Common Crawl
 * - Preprocessed with appropriate padding and attention masks
 * 
 * Key architectural components:
 * - Token and positional embeddings
 * - Multi-head self-attention blocks
 * - Layer normalization
 * - Linear output projection
 * - Cross-entropy loss computation
 * - Adam optimization with backpropagation
 * 
 *
 * Advanced usage scenarios:
 * - Fine-tuning on domain-specific data
 * - Transfer learning from pre-trained weights
 * - Ensemble methods with multiple trained models
 * - Model compression and quantization
 * 
 * @example
 * ```javascript
 * import { trainNextWordPrediction, Transformer } from './transformer-training.js';
 *
 * // Train a new model
 * const results = await trainNextWordPrediction();
 * console.log('Training completed with final loss:', results.finalLoss);
 *
 * // Generate a language response based using the trained model
 * const model = results.model;
 * const predictions = model.forward(inputTokens);
 * ```
 * @author [vtempest](https://github.com/vtempest)
 * @returns {Promise<Object>} Training results containing final loss and model
 * @see
 * - Original Transformer paper: https://arxiv.org/abs/1706.03762 ("Attention Is All You Need")
 * - PyTorch Transformer tutorial: https://pytorch.org/tutorials/beginner/transformer_tutorial.html
 * - Annotated Transformer: https://nlp.seas.harvard.edu/2018/04/03/attention.html
 * - GPU.js documentation: https://gpu.rocks/
 */
export async function trainNextWordPrediction() {
  // Import neural network modules and optimization utilities
  const nn = torch.nn;
  const optim = torch.optim;
  
  // Set device to GPU for accelerated computation using GPU.js
  // GPU.js compiles JavaScript functions to run on the GPU via WebGL shaders
  // Reference: https://github.com/gpujs/gpu.js
  const device = "gpu";

  // =====================================================
  // HYPERPARAMETER CONFIGURATION
  // =====================================================
  
  /**
   * Vocabulary size - total number of unique tokens in the dataset
   * In a real scenario, this would be determined by your tokenizer
   * Common values: 50,257 (GPT-2), 32,000 (T5), 30,522 (BERT)
   */
  const vocab_size = 52;
  
  /**
   * Hidden dimension size - the dimensionality of token representations
   * Also known as d_model in the original Transformer paper
   * Common values: 768 (BERT-base), 1024 (GPT-2 small), 1536 (GPT-2 medium)
   */
  const hidden_size = 32;
  
  /**
   * Maximum sequence length - number of tokens the model can process at once
   * Also determines the size of positional embeddings
   * Common values: 512 (BERT), 1024 (GPT-2), 2048 (GPT-3)
   */
  const n_timesteps = 16;
  
  /**
   * Number of attention heads in multi-head attention mechanism
   * Must divide evenly into hidden_size (hidden_size % n_heads == 0)
   * Each head has dimension d_k = hidden_size / n_heads
   * Reference: https://arxiv.org/abs/1706.03762 Section 3.2.2
   */
  const n_heads = 4;
  
  /**
   * Dropout probability for regularization
   * Applied to attention weights and feed-forward layers
   * Set to 0 for this test to focus on core functionality
   * Typical values: 0.1 (BERT), 0.1-0.3 (various models)
   */
  const dropout_p = 0;
  
  /**
   * Batch size - number of sequences processed simultaneously
   * Larger batches provide more stable gradients but require more memory
   * GPU memory is the limiting factor for batch size
   */
  const batch_size = 8;
  
  /**
   * Number of training epochs
   * In practice, models are trained for thousands to millions of steps
   * Early stopping based on validation loss is typically used
   */
  const numberEpochs = 30;

  // =====================================================
  // TRANSFORMER MODEL ARCHITECTURE
  // =====================================================

  /**
   * Transformer Decoder Model Implementation
   * 
   * This implements a simplified decoder-only transformer similar to GPT models.
   * The architecture follows the "Attention Is All You Need" paper but excludes
   * the encoder and uses only the decoder stack for autoregressive generation.
   * 
   * Architecture Overview:
   * 1. Token Embedding: Maps discrete tokens to continuous vectors
   * 2. Positional Embedding: Adds position information to token embeddings
   * 3. Transformer Blocks: Self-attention + feed-forward layers
   * 4. Layer Normalization: Stabilizes training and improves convergence
   * 5. Output Projection: Maps hidden states back to vocabulary logits
   * 
   * Key References:
   * - Original paper: https://arxiv.org/abs/1706.03762
   * - GPT paper: https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf
   * - Tutorial implementation: https://www.youtube.com/watch?v=U0s0f995w14&t=260s
   */
  class Transformer extends nn.Module {
    /** 
     * Initialize the Transformer decoder model
     * 
     * @param {number} vocab_size - Size of the vocabulary (number of unique tokens)
     * @param {number} hidden_size - Dimensionality of embeddings and hidden states
     * @param {number} n_timesteps - Maximum sequence length for positional embeddings
     * @param {number} n_heads - Number of attention heads in multi-head attention
     * @param {number} dropout_p - Dropout probability for regularization
     * @param {string} device - Computation device ("cpu" or "gpu")
     * 
     * Architecture inspired by:
     * - "Attention Is All You Need": https://arxiv.org/abs/1706.03762
     * - "Language Models are Unsupervised Multitask Learners": https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf
     * - PyTorch Transformer implementation: https://pytorch.org/docs/stable/generated/torch.nn.Transformer.html
     */
    constructor(vocab_size, hidden_size, n_timesteps, n_heads, dropout_p, device) {
      super();
      
      // =====================================================
      // EMBEDDING LAYERS
      // =====================================================
      
      /**
       * Token Embedding Layer
       * Maps discrete token IDs to dense vector representations
       * This is a learnable lookup table of size [vocab_size, hidden_size]
       * Each row represents the embedding vector for a specific token
       * 
       * Reference: https://pytorch.org/docs/stable/generated/torch.nn.Embedding.html
       */
      this.embed = new nn.Embedding(vocab_size, hidden_size);
      
      /**
       * Positional Embedding Layer
       * Adds position information to token embeddings since attention is permutation-invariant
       * Can be learned parameters or fixed sinusoidal encodings
       * Shape: [n_timesteps, hidden_size]
       * 
       * Original paper uses sinusoidal encodings: https://arxiv.org/abs/1706.03762 Section 3.5
       * GPT uses learned positional embeddings: https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf
       */
      this.pos_embed = new nn.PositionalEmbedding(n_timesteps, hidden_size);
      
      // =====================================================
      // TRANSFORMER BLOCKS (DECODER LAYERS)
      // =====================================================
      
      /**
       * First Transformer Block
       * Contains multi-head self-attention and feed-forward networks
       * Each block implements: LayerNorm -> Attention -> Residual -> LayerNorm -> FFN -> Residual
       * 
       * Block components:
       * - Multi-head self-attention with causal masking (for autoregressive generation)
       * - Position-wise feed-forward network (2-layer MLP with ReLU activation)
       * - Residual connections around each sub-layer
       * - Layer normalization (applied before each sub-layer in this implementation)
       * 
       * Reference: https://arxiv.org/abs/1706.03762 Section 3.1
       */
      this.b1 = new nn.Block(hidden_size, hidden_size, n_heads, n_timesteps, dropout_p, device);
      
      /**
       * Second Transformer Block
       * Identical architecture to the first block
       * Multiple blocks allow the model to build increasingly complex representations
       * 
       * In practice, transformer models use many more blocks:
       * - GPT-2 small: 12 blocks
       * - GPT-2 medium: 24 blocks  
       * - GPT-2 large: 36 blocks
       * - GPT-3: 96 blocks
       */
      this.b2 = new nn.Block(hidden_size, hidden_size, n_heads, n_timesteps, dropout_p, device);
      
      // =====================================================
      // OUTPUT LAYERS
      // =====================================================
      
      /**
       * Final Layer Normalization
       * Applied to the output of the last transformer block
       * Helps stabilize training and improves convergence
       * 
       * Layer normalization normalizes across the feature dimension:
       * LayerNorm(x) = γ * (x - μ) / σ + β
       * where μ and σ are computed across the hidden_size dimension
       * 
       * Reference: https://arxiv.org/abs/1607.06450
       */
      this.ln = new nn.LayerNorm(hidden_size);
      
      /**
       * Output Projection Layer
       * Linear transformation from hidden_size to vocab_size
       * Produces logits over the vocabulary for next-token prediction
       * 
       * Shape transformation: [batch_size, seq_len, hidden_size] -> [batch_size, seq_len, vocab_size]
       * 
       * In some implementations, this layer shares weights with the token embedding layer
       * (weight tying) to reduce parameters and improve performance
       * Reference: https://arxiv.org/abs/1608.05859
       */
      this.linear = new nn.Linear(hidden_size, vocab_size, device);
    }
    
    /**
     * Forward pass through the transformer model
     * 
     * Implements the complete forward computation graph:
     * 1. Token + Positional Embeddings
     * 2. Multiple Transformer Blocks  
     * 3. Final Layer Normalization
     * 4. Output Projection to Vocabulary
     * 
     * @param {Tensor} x - Input token IDs of shape [batch_size, seq_len, 1]
     * @returns {Tensor} - Output logits of shape [batch_size, seq_len, vocab_size]
     * 
     * Data flow visualization:
     * Input IDs -> Embeddings -> Block1 -> Block2 -> LayerNorm -> Linear -> Logits
     */
    forward(x) {
      let z;
      
      // =====================================================
      // EMBEDDING COMPUTATION
      // =====================================================
      
      /**
       * Combine token and positional embeddings
       * Token embeddings provide semantic meaning
       * Positional embeddings provide sequence order information
       * 
       * Both embeddings are added element-wise (not concatenated)
       * This allows the model to understand both "what" (token) and "where" (position)
       */
      z = torch.add(this.embed.forward(x), this.pos_embed.forward(x));
      
      // =====================================================
      // TRANSFORMER BLOCK PROCESSING
      // =====================================================
      
      /**
       * Pass through first transformer block
       * Applies self-attention to capture dependencies between tokens
       * Each position can attend to all previous positions (causal masking)
       */
      z = this.b1.forward(z);
      
      /**
       * Pass through second transformer block
       * Builds more complex representations on top of the first block's output
       * Allows modeling of higher-order interactions between tokens
       */
      z = this.b2.forward(z);
      
      // =====================================================
      // OUTPUT COMPUTATION
      // =====================================================
      
      /**
       * Apply final layer normalization
       * Ensures stable gradients and consistent scale for the output projection
       */
      z = this.ln.forward(z);
      
      /**
       * Project to vocabulary size
       * Converts hidden representations to logits over all possible next tokens
       * These logits will be used with cross-entropy loss for training
       */
      z = this.linear.forward(z);
      
      return z;
    }
  }
    
  // =====================================================
  // MODEL INSTANTIATION AND SETUP
  // =====================================================

  /**
   * Create the transformer model instance
   * All layers are initialized with random weights that will be learned during training
   * 
   * Weight initialization strategies:
   * - Embedding layers: typically normal distribution with small variance
   * - Linear layers: Xavier/Glorot or He initialization
   * - Layer norm: bias=0, weight=1
   * 
   * Reference: https://pytorch.org/docs/stable/nn.init.html
   */
  const model = new Transformer(
    vocab_size,
    hidden_size,
    n_timesteps,
    n_heads,
    dropout_p,
    device
  );

  // =====================================================
  // LOSS FUNCTION AND OPTIMIZER SETUP
  // =====================================================
  
  /**
   * Cross-Entropy Loss Function
   * Standard loss for multi-class classification tasks like language modeling
   * 
   * For language modeling, we predict the next token given previous tokens:
   * Loss = -log(P(token_t+1 | token_1, ..., token_t))
   * 
   * Cross-entropy combines softmax activation with negative log-likelihood:
   * CE(y, ŷ) = -Σ y_i * log(softmax(ŷ_i))
   * 
   * Reference: https://pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html
   */
  const loss_func = new nn.CrossEntropyLoss();
  
  /**
   * Adam Optimizer
   * Adaptive learning rate optimization algorithm
   * 
   * Adam combines momentum (first moment) and RMSprop (second moment):
   * - Maintains running averages of gradients and squared gradients
   * - Adapts learning rate per parameter
   * - Works well for noisy gradients and sparse data
   * 
   * Parameters:
   * - Learning rate: 5e-3 (0.005) - relatively high for small model
   * - Weight decay: 0 - no L2 regularization in this test
   * 
   * References:
   * - Original Adam paper: https://arxiv.org/abs/1412.6980
   * - PyTorch implementation: https://pytorch.org/docs/stable/generated/torch.optim.Adam.html
   */
  const optimizer = new optim.Adam(model.parameters(), 5e-3, 0);

  // =====================================================
  // SYNTHETIC TRAINING DATA GENERATION
  // =====================================================
  
  /**
   * Generate random input sequences
   * Shape: [batch_size, n_timesteps, 1]
   * 
   * In real applications, this would be:
   * - Tokenized text data (e.g., using BPE, WordPiece, or SentencePiece)
   * - Loaded from datasets like WikiText, BookCorpus, or Common Crawl
   * - Preprocessed with appropriate padding and attention masks
   * 
   * Random data is used here to test the training mechanics without
   * requiring actual text preprocessing
   */
  let x = torch.randint(0, vocab_size, [batch_size, n_timesteps, 1]);
  
  /**
   * Generate random target sequences  
   * Shape: [batch_size, n_timesteps]
   * 
   * For language modeling, targets are typically input sequences shifted by one position:
   * Input:  [BOS, token1, token2, token3]
   * Target: [token1, token2, token3, EOS]
   * 
   * This teaches the model to predict the next token in the sequence
   */
  let y = torch.randint(0, vocab_size, [batch_size, n_timesteps]);
  
  // Variable to track loss during training
  let loss;

  // =====================================================
  // TRAINING LOOP
  // =====================================================
  
  /**
   * Main training loop implementing the standard deep learning training procedure:
   * 1. Forward pass: compute model predictions
   * 2. Loss computation: compare predictions with targets  
   * 3. Backward pass: compute gradients via backpropagation
   * 4. Parameter update: apply gradients using optimizer
   * 5. Gradient reset: clear gradients for next iteration
   * 
   * This follows the PyTorch training paradigm:
   * https://pytorch.org/tutorials/beginner/blitz/cifar10_tutorial.html#training-the-network
   */
  for (let i = 0; i < numberEpochs; i++) {
    
    // =====================================================
    // FORWARD PASS
    // =====================================================
    
    /**
     * Compute model predictions (forward pass)
     * 
     * The model processes input tokens through:
     * 1. Embedding layers (token + positional)
     * 2. Self-attention mechanisms in transformer blocks
     * 3. Feed-forward networks  
     * 4. Output projection to vocabulary logits
     * 
     * Output shape: [batch_size, n_timesteps, vocab_size]
     * Each position contains logits for predicting the next token
     */
    let z = model.forward(x);

    // =====================================================
    // LOSS COMPUTATION
    // =====================================================
    
    /**
     * Compute cross-entropy loss between predictions and targets
     * 
     * The loss measures how well the model's predicted probability distribution
     * matches the true next tokens. Lower loss indicates better predictions.
     * 
     * Cross-entropy is differentiable, allowing gradient-based optimization
     * The loss automatically handles the softmax computation internally
     */
    loss = loss_func.forward(z, y);

    // =====================================================
    // BACKWARD PASS (BACKPROPAGATION)
    // =====================================================
    
    /**
     * Compute gradients via automatic differentiation
     * 
     * Backpropagation applies the chain rule to compute gradients of the loss
     * with respect to all model parameters. This enables gradient-based optimization.
     * 
     * The computational graph tracks all operations during the forward pass,
     * then traverses it backwards to compute gradients efficiently.
     * 
     * Key algorithm: https://en.wikipedia.org/wiki/Backpropagation
     * Implementation details: https://pytorch.org/tutorials/beginner/blitz/autograd_tutorial.html
     */
    loss.backward();

    // =====================================================
    // PARAMETER UPDATE
    // =====================================================
    
    /**
     * Update model parameters using computed gradients
     * 
     * The Adam optimizer updates each parameter using:
     * 1. Current gradient
     * 2. Exponential moving average of gradients (momentum)
     * 3. Exponential moving average of squared gradients (adaptive learning rate)
     * 
     * This step moves the model parameters in the direction that reduces loss
     */
    optimizer.step();

    // =====================================================
    // GRADIENT RESET
    // =====================================================
    
    /**
     * Clear gradients from the previous iteration
     * 
     * PyTorch accumulates gradients by default, so we must explicitly zero them
     * after each parameter update to prevent gradient accumulation across iterations.
     * 
     * This is essential for correct training behavior
     */
    optimizer.zero_grad();

    // =====================================================
    // TRAINING MONITORING
    // =====================================================
    
    /**
     * Log training progress
     * 
     * Monitor loss decrease over time to verify that training is working
     * In practice, you would also track:
     * - Validation loss and accuracy
     * - Learning rate schedules
     * - Gradient norms
     * - Model perplexity
     * 
     * Tools for monitoring: TensorBoard, Weights & Biases, MLflow
     */
    console.log(`Iter ${i} - Loss ${loss.data[0].toFixed(4)}`);
  }

  // =====================================================
  // TEST RESULTS RETURN
  // =====================================================
  
  /**
   * Return training results for analysis and validation
   * 
   * This provides access to:
   * 1. The trained model for inference or further training
   * 2. Final loss value to verify training effectiveness
   * 3. Training metadata for analysis
   * 
   * In a production setting, you would also return:
   * - Training history (loss over time)
   * - Model checkpoints
   * - Validation metrics
   * - Training configuration
   */
  return {
    model: model,
    finalLoss: loss.data[0],
    trainingCompleted: true,
    epochs: numberEpochs,
    hyperparameters: {
      vocab_size,
      hidden_size,
      n_timesteps,
      n_heads,
      dropout_p,
      batch_size,
      numberEpochs
    }
  };
}
export { Transformer };
