import { test, expect } from "vitest";
import { torch } from "../../ai-research-agent/index.js"


test("should train a self-attention transformer with Adam k,v,q  and GPU.js", async () => {
  const nn = torch.nn;
  const optim = torch.optim;
  const device = "gpu";

  // Define training hyperparameters:
  const vocab_size = 52;
  const hidden_size = 32;
  const n_timesteps = 16;
  const n_heads = 4;
  const dropout_p = 0;
  const batch_size = 8;
  const numberEpochs = 30;


  class Transformer extends nn.Module {
    /** 
     * Create Transformer decoder Module:
     *  [Pytorch Transformers from Scratch (Attention is all you 
     * need)](https://www.youtube.com/watch?v=U0s0f995w14&t=260s)
     */
    constructor(vocab_size, hidden_size, n_timesteps, n_heads, dropout_p, device) {
      super();
      // Instantiate Transformer's Layers:
      this.embed = new nn.Embedding(vocab_size, hidden_size);
      this.pos_embed = new nn.PositionalEmbedding(n_timesteps, hidden_size);
      this.b1 = new nn.Block(hidden_size, hidden_size, n_heads, n_timesteps, dropout_p, device);
      this.b2 = new nn.Block(hidden_size, hidden_size, n_heads, n_timesteps, dropout_p, device);
      this.ln = new nn.LayerNorm(hidden_size);
      this.linear = new nn.Linear(hidden_size, vocab_size, device);
    }
    
    forward(x) {
      let z;
      z = torch.add(this.embed.forward(x), this.pos_embed.forward(x));
      z = this.b1.forward(z);
      z = this.b2.forward(z);
      z = this.ln.forward(z);
      z = this.linear.forward(z);
      return z;
    }
    }
    
  

  // Instantiate your custom nn.Module:
  const model = new Transformer(
    vocab_size,
    hidden_size,
    n_timesteps,
    n_heads,
    dropout_p,
    device
  );

  // Define loss function and optimizer:
  const loss_func = new nn.CrossEntropyLoss();
  const optimizer = new optim.Adam(model.parameters(), 5e-3, 0);

  // Instantiate sample input and output:
  let x = torch.randint(0, vocab_size, [batch_size, n_timesteps, 1]);
  let y = torch.randint(0, vocab_size, [batch_size, n_timesteps]);
  let loss;

  // Training Loop:
  for (let i = 0; i < numberEpochs; i++) {
    // Forward pass through the Transformer:
    let z = model.forward(x);

    // Get loss:
    loss = loss_func.forward(z, y);

    // Backpropagate the loss using torch.tensor's backward() method:
    loss.backward();

    // Update the weights:
    optimizer.step();

    // Reset the gradients to zero after each training step:
    optimizer.zero_grad();

    // Print loss at every iteration:
    console.log(`Iter ${i} - Loss ${loss.data[0].toFixed(4)}`);
  }

  expect(loss.data[0]).toBeDefined();
}, 100000);
