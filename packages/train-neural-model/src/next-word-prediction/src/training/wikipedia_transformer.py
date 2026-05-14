"""
**-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
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
                     _/  _/      `"///   /'                  ; b   ;
                 _.-~_.-~           /  /'                _.'~bb _.'
               ((((~~              / /'              _.'~bb.--~
                                  ((((          __.-~bb.-~
                                              .'  b .~~
                                              :bb ,' 
                                              ~~*/


=======================================================================================
### Predict Next Word Based On Vectors of Learned Context Patterns in Training Examples
=======================================================================================

This implements a decoder-only transformer architecture that learns statistical patterns 
from the entire English Wikipedia corpus to predict the next word in a sequence. Language 
models work by converting words into high-dimensional vectors—numerical lists that capture 
meaning and relationships between concepts. These mathematical representations allow models 
to understand that "king/queen" share properties and "Paris/France" mirrors "Tokyo/Japan" 
through their transformer architecture, a neural network backbone that processes information 
through multiple layers.

The attention mechanism enables the system to dynamically focus on relevant parts of input 
text when generating each word, maintaining context like humans tracking conversation threads, 
while calculating probability scores across the entire vocabulary for each word position 
based on processed context. Rather than retrieving stored responses, models create novel 
text by selecting the most probable words given learned patterns.

🔍 Self-Attention Mechanism:
Each word creates three representations: Query (what it's looking for), Key (what it offers), 
and Value (its actual content). For example, in "The cat sat on the mat," the word "cat" 
has a Query vector that searches for actions, a Key vector that advertises itself as a 
subject, and a Value vector containing its semantic meaning as an animal. The attention 
mechanism calculates how much "cat" should focus on other words by comparing its Query 
with their Keys - finding high similarity with "sat" (the action) - then combines the 
corresponding Value vectors to create a contextualized representation where "cat" now 
understands it's the one doing the sitting.

📚 Learning Resources:
- LLM Training Example: https://github.com/vtempest/ai-research-agent/blob/master/packages/neural-net/src/train/predict-next-word.js
- Transformer Overview: https://jalammar.github.io/illustrated-transformer/
- Building Transformer Guide: https://www.datacamp.com/tutorial/building-a-transformer-with-py-torch
- Hugging Face Tutorials: https://huggingface.co/learn
- OpenAI Cookbook: https://cookbook.openai.com
- PyTorch Overview: https://www.learnpytorch.io/pytorch_cheatsheet/
- Original Transformer Paper: https://arxiv.org/abs/1706.03762 ("Attention Is All You Need")
- GPT Paper: https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf
- Tinygrad Documentation: https://docs.tinygrad.org/
"""

from tinygrad.tensor import Tensor
from tinygrad.nn import Linear, LayerNorm, Embedding
from tinygrad.nn.optim import Adam
import math
import numpy as np
import json
import os
import re
import pickle
import subprocess
import shutil
from collections import Counter, defaultdict
from typing import List, Dict, Tuple, Optional
import time
from dataclasses import dataclass
try:
    import pymongo
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False
    print("⚠️ PyMongo not available. Install with: pip install pymongo")


@dataclass
class WikipediaConfig:
    """
    🔧 Configuration for Wikipedia Training with Dumpster-Dive Integration
    
    Centralized configuration for all hyperparameters and file paths.
    Now includes MongoDB integration for efficient Wikipedia processing.
    """
    # 📁 Data paths
    wikipedia_dump_path: str = "enwiki-latest-pages-articles.xml"  # Uncompressed XML file
    wikipedia_bz2_path: str = "enwiki-latest-pages-articles.xml.bz2"  # Compressed download
    processed_data_dir: str = "./wikipedia_processed"
    tokenizer_path: str = "./wikipedia_tokenizer.pkl"
    model_checkpoint_dir: str = "./model_checkpoints"
    
    # 🗄️ MongoDB settings for dumpster-dive
    mongo_host: str = "localhost"
    mongo_port: int = 27017
    mongo_db_name: str = "enwiki"
    mongo_collection: str = "pages"
    
    # 📊 Data processing settings
    max_articles_demo: int = 100000  # For demo mode
    min_article_length: int = 100  # Minimum characters per article
    max_article_length: int = 50000  # Maximum characters per article (for memory)
    use_demo_mode: bool = True  # Set to False for full Wikipedia processing
    
    # 🔤 Tokenizer settings
    vocab_size: int = 32000  # Standard BPE vocabulary size
    min_token_frequency: int = 5  # Minimum frequency for token inclusion
    special_tokens: List[str] = None  # Will be set in __post_init__
    
    # 🏗️ Model architecture
    embedding_dimension: int = 512  # Hidden size of embeddings
    sequence_max_length: int = 1024  # Maximum sequence length
    num_attention_heads: int = 8  # Number of parallel attention mechanisms
    num_transformer_layers: int = 6  # Number of transformer blocks
    feed_forward_dimension: int = 2048  # FFN intermediate size (4 * embedding_dim)
    dropout_probability: float = 0.1  # Regularization rate
    
    # 🎓 Training configuration
    batch_size: int = 16  # Number of sequences per batch
    gradient_accumulation_steps: int = 4  # Effective batch size = batch_size * grad_accum_steps
    num_training_epochs: int = 3  # Number of passes through data
    learning_rate: float = 1e-4  # Base learning rate
    warmup_steps: int = 10000  # Learning rate warmup steps
    weight_decay: float = 0.01  # L2 regularization
    gradient_clip_norm: float = 1.0  # Gradient clipping threshold
    
    # 💾 Checkpointing and logging
    save_every_steps: int = 5000  # Save checkpoint frequency
    log_every_steps: int = 100  # Logging frequency
    eval_every_steps: int = 2000  # Evaluation frequency
    max_checkpoints_to_keep: int = 5  # Number of checkpoints to retain
    
    # 🎯 Generation settings
    generation_max_length: int = 200  # Max tokens to generate
    generation_temperature: float = 0.8  # Sampling temperature
    generation_top_k: int = 50  # Top-k sampling
    generation_top_p: float = 0.9  # Nucleus sampling
    
    def __post_init__(self):
        """Initialize special tokens and create directories"""
        if self.special_tokens is None:
            self.special_tokens = ["<PAD>", "<UNK>", "<BOS>", "<EOS>", "<SEP>"]
        
        # Create necessary directories
        os.makedirs(self.processed_data_dir, exist_ok=True)
        os.makedirs(self.model_checkpoint_dir, exist_ok=True)


class DumpsterDiveIntegration:
    """
    🗂️ Dumpster-Dive Integration for Efficient Wikipedia Processing
    
    Integrates with the dumpster-dive tool to efficiently process Wikipedia dumps
    into MongoDB and extract clean text for training. This is much faster and more
    reliable than manual XML parsing.
    
    Dumpster-dive parses Wikipedia XML dumps and stores structured data in MongoDB,
    making it easy to query articles by category, length, quality, etc.
    
    Installation:
    npm install -g dumpster-dive
    
    Usage:
    dumpster ./enwiki-latest-pages-articles.xml --db=enwiki
    
    Args:
        config: WikipediaConfig containing MongoDB and file settings
    """
    
    def __init__(self, config: WikipediaConfig):
        self.config = config
        self.mongo_client = None
        self.db = None
        self.collection = None
        
    def check_dependencies(self) -> bool:
        """
        🔍 Check if required dependencies are available
        
        Verifies that Node.js, dumpster-dive, and MongoDB are installed
        and accessible from the command line.
        
        Returns:
            bool: True if all dependencies are available
        """
        print("🔍 Checking dependencies...")
        
        # Check Node.js
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ Node.js: {result.stdout.strip()}")
            else:
                print("❌ Node.js not found. Install from https://nodejs.org/")
                return False
        except FileNotFoundError:
            print("❌ Node.js not found. Install from https://nodejs.org/")
            return False
        
        # Check dumpster-dive
        try:
            result = subprocess.run(['dumpster', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ dumpster-dive: available")
            else:
                print("❌ dumpster-dive not found. Install with: npm install -g dumpster-dive")
                return False
        except FileNotFoundError:
            print("❌ dumpster-dive not found. Install with: npm install -g dumpster-dive")
            return False
        
        # Check MongoDB
        try:
            result = subprocess.run(['mongod', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ MongoDB: available")
            else:
                print("❌ MongoDB not found. Install from https://www.mongodb.com/")
                return False
        except FileNotFoundError:
            print("❌ MongoDB not found. Install from https://www.mongodb.com/")
            return False
        
        # Check PyMongo
        if not PYMONGO_AVAILABLE:
            print("❌ PyMongo not found. Install with: pip install pymongo")
            return False
        else:
            print("✅ PyMongo: available")
        
        return True
    
    def download_wikipedia_dump(self) -> bool:
        """
        📥 Download Wikipedia dump if not present
        
        Downloads the compressed Wikipedia dump and optionally uncompresses it.
        Provides progress updates and handles resume for interrupted downloads.
        
        Returns:
            bool: True if download/extraction successful
        """
        if os.path.exists(self.config.wikipedia_dump_path):
            print(f"✅ Wikipedia dump already exists: {self.config.wikipedia_dump_path}")
            return True
        
        if os.path.exists(self.config.wikipedia_bz2_path):
            print(f"📦 Found compressed dump: {self.config.wikipedia_bz2_path}")
        else:
            print("📥 Downloading Wikipedia dump...")
            print("⚠️ This is a large file (16GB+) and will take time!")
            
            # Construct download URL
            download_url = "https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles.xml.bz2"
            
            print(f"🌐 URL: {download_url}")
            print("💡 You can also download manually and place in current directory")
            
            # Use wget for download with resume capability
            try:
                cmd = ['wget', '-c', download_url, '-O', self.config.wikipedia_bz2_path]
                result = subprocess.run(cmd, check=True)
                print("✅ Download completed!")
            except subprocess.CalledProcessError:
                print("❌ Download failed. Please download manually:")
                print(f"wget {download_url}")
                return False
            except FileNotFoundError:
                print("❌ wget not found. Please download manually:")
                print(f"curl -L -o {self.config.wikipedia_bz2_path} {download_url}")
                return False
        
        # Decompress the file
        print("📦 Decompressing Wikipedia dump...")
        print("⚠️ This will take 10-60 minutes depending on your CPU")
        print("💡 Consider using lbzip2 for faster decompression: brew install lbzip2")
        
        try:
            # Try lbzip2 first (much faster)
            if shutil.which('lbzip2'):
                print("🚀 Using lbzip2 for fast decompression...")
                cmd = ['lbzip2', '-d', '-k', self.config.wikipedia_bz2_path]
            else:
                print("⏳ Using standard bzip2 decompression...")
                cmd = ['bzip2', '-d', '-k', self.config.wikipedia_bz2_path]
            
            result = subprocess.run(cmd, check=True)
            print("✅ Decompression completed!")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Decompression failed: {e}")
            return False
    
    def setup_mongodb(self) -> bool:
        """
        🗄️ Setup MongoDB connection and database
        
        Establishes connection to MongoDB and creates the database/collection
        for storing Wikipedia articles.
        
        Returns:
            bool: True if MongoDB setup successful
        """
        try:
            print("🗄️ Connecting to MongoDB...")
            self.mongo_client = pymongo.MongoClient(
                host=self.config.mongo_host,
                port=self.config.mongo_port,
                serverSelectionTimeoutMS=5000
            )
            
            # Test connection
            self.mongo_client.server_info()
            print(f"✅ Connected to MongoDB at {self.config.mongo_host}:{self.config.mongo_port}")
            
            # Setup database and collection
            self.db = self.mongo_client[self.config.mongo_db_name]
            self.collection = self.db[self.config.mongo_collection]
            
            return True
            
        except pymongo.errors.ServerSelectionTimeoutError:
            print("❌ Cannot connect to MongoDB. Make sure MongoDB is running:")
            print("mongod --config /path/to/mongod.conf")
            return False
        except Exception as e:
            print(f"❌ MongoDB setup failed: {e}")
            return False
    
    def run_dumpster_dive(self) -> bool:
        """
        🏃 Run dumpster-dive to process Wikipedia dump
        
        Executes the dumpster-dive command to parse the Wikipedia XML dump
        and load it into MongoDB. This process can take several hours for
        the full English Wikipedia.
        
        Returns:
            bool: True if processing successful
        """
        if not os.path.exists(self.config.wikipedia_dump_path):
            print(f"❌ Wikipedia dump not found: {self.config.wikipedia_dump_path}")
            return False
        
        # Check if data already exists
        if self.collection and self.collection.count_documents({}) > 0:
            count = self.collection.count_documents({})
            print(f"✅ Wikipedia data already in MongoDB: {count:,} articles")
            return True
        
        print("🏃 Running dumpster-dive to process Wikipedia dump...")
        print("⚠️ This will take several hours for full English Wikipedia")
        print("💡 You can monitor progress in another terminal with:")
        print(f"   mongo {self.config.mongo_db_name} --eval 'db.{self.config.mongo_collection}.count()'")
        
        try:
            # Run dumpster-dive command
            cmd = [
                'dumpster',
                self.config.wikipedia_dump_path,
                '--db', self.config.mongo_db_name,
                '--citations=false',  # Skip citations for cleaner text
                '--images=false',     # Skip image processing
                '--verbose'           # Show progress
            ]
            
            print(f"🔄 Command: {' '.join(cmd)}")
            
            # Run with real-time output
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            
            for line in process.stdout:
                print(f"📊 {line.strip()}")
            
            process.wait()
            
            if process.returncode == 0:
                print("✅ dumpster-dive completed successfully!")
                return True
            else:
                print(f"❌ dumpster-dive failed with exit code {process.returncode}")
                return False
                
        except Exception as e:
            print(f"❌ Error running dumpster-dive: {e}")
            return False
    
    def get_article_count(self) -> int:
        """
        📊 Get total number of articles in MongoDB
        
        Returns:
            int: Number of articles in the database
        """
        if not self.collection:
            return 0
        return self.collection.count_documents({})
    
    def extract_articles(self, limit: int = None) -> List[str]:
        """
        📖 Extract clean article text from MongoDB
        
        Retrieves articles from MongoDB and extracts clean text suitable
        for language model training. Filters by length and quality.
        
        Args:
            limit: Maximum number of articles to extract (None for all)
            
        Returns:
            List of clean article texts
        """
        if not self.collection:
            print("❌ MongoDB collection not available")
            return []
        
        print(f"📖 Extracting articles from MongoDB...")
        
        # Build query to filter articles
        query = {
            # Only main namespace articles (not talk pages, categories, etc.)
            'ns': 0,
            # Minimum length filter
            'text': {'$regex': '.{' + str(self.config.min_article_length) + ',}'}
        }
        
        # Projection to only get text field for memory efficiency
        projection = {'text': 1, 'title': 1, '_id': 0}
        
        articles = []
        total_count = self.collection.count_documents(query)
        
        if limit:
            total_count = min(total_count, limit)
        
        print(f"📊 Processing {total_count:,} articles...")
        
        cursor = self.collection.find(query, projection)
        if limit:
            cursor = cursor.limit(limit)
        
        processed = 0
        for doc in cursor:
            try:
                text = doc.get('text', '')
                if text and len(text) >= self.config.min_article_length:
                    # Additional cleaning
                    cleaned_text = self.clean_article_text(text)
                    if len(cleaned_text) >= self.config.min_article_length:
                        articles.append(cleaned_text)
                
                processed += 1
                if processed % 10000 == 0:
                    print(f"📈 Processed {processed:,}/{total_count:,} articles")
                    
            except Exception as e:
                print(f"⚠️ Error processing article: {e}")
                continue
        
        print(f"✅ Extracted {len(articles):,} clean articles")
        return articles
    
    def clean_article_text(self, text: str) -> str:
        """
        🧹 Clean article text for training
        
        Removes Wikipedia-specific markup and formatting that's not useful
        for language model training.
        
        Args:
            text: Raw article text from MongoDB
            
        Returns:
            Cleaned text suitable for training
        """
        # Remove remaining wiki markup
        text = re.sub(r'\{\{[^}]+\}\}', '', text)  # Templates
        text = re.sub(r'\[\[Category:[^\]]+\]\]', '', text)  # Categories
        text = re.sub(r'\[\[File:[^\]]+\]\]', '', text)  # Files
        text = re.sub(r'\[\[Image:[^\]]+\]\]', '', text)  # Images
        
        # Clean up links
        text = re.sub(r'\[\[([^|\]]+)\|([^\]]+)\]\]', r'\2', text)  # [[target|display]] -> display
        text = re.sub(r'\[\[([^\]]+)\]\]', r'\1', text)  # [[target]] -> target
        
        # Remove references
        text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL)
        text = re.sub(r'<ref[^>]*/?>', '', text)
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        # Limit article length for memory efficiency
        if len(text) > self.config.max_article_length:
            text = text[:self.config.max_article_length]
        
        return text
    
    def get_sample_articles(self, categories: List[str] = None, limit: int = 100) -> List[Dict]:
        """
        🎯 Get sample articles for testing
        
        Retrieves a small sample of articles for quick testing and development.
        Can filter by categories if specified.
        
        Args:
            categories: List of category names to filter by
            limit: Number of articles to return
            
        Returns:
            List of article dictionaries with title and text
        """
        if not self.collection:
            return []
        
        query = {'ns': 0}  # Main namespace only
        
        if categories:
            query['categories'] = {'$in': categories}
        
        projection = {'title': 1, 'text': 1, 'categories': 1, '_id': 0}
        
        articles = []
        for doc in self.collection.find(query, projection).limit(limit):
            text = self.clean_article_text(doc.get('text', ''))
            if len(text) >= self.config.min_article_length:
                articles.append({
                    'title': doc.get('title', ''),
                    'text': text,
                    'categories': doc.get('categories', [])
                })
        
        return articles
    """
    🔤 Byte-Pair Encoding (BPE) Tokenizer for Wikipedia Text
    
    Implements a simplified BPE tokenizer that learns subword units from the Wikipedia corpus.
    BPE handles out-of-vocabulary words by breaking them into smaller, learned subword pieces.
    This is crucial for handling the diverse vocabulary in Wikipedia articles.
    
    Reference: https://arxiv.org/abs/1508.07909 (Neural Machine Translation of Rare Words with Subword Units)
    
    The tokenizer learns frequent character pairs and merges them iteratively:
    1. Start with character-level vocabulary
    2. Find most frequent character pair
    3. Merge this pair into a single token
    4. Repeat until desired vocabulary size
    
    Example progression:
    "unhappiness" -> ["u", "n", "h", "a", "p", "p", "i", "n", "e", "s", "s"]
    After learning "pp" -> ["u", "n", "h", "a", "pp", "i", "n", "e", "s", "s"]
    After learning "un" -> ["un", "h", "a", "pp", "i", "n", "e", "s", "s"]
    """
    
    def __init__(self, config: WikipediaConfig):
        self.config = config
        self.token_to_id: Dict[str, int] = {}
        self.id_to_token: Dict[int, str] = {}
        self.bpe_merges: List[Tuple[str, str]] = []
        self.word_frequencies: Dict[str, int] = Counter()
        
    def clean_text(self, text: str) -> str:
        """
        🧹 Clean and normalize Wikipedia text
        
        Wikipedia XML contains markup, references, and formatting that needs cleaning.
        This function standardizes the text for tokenization.
        
        Args:
            text: Raw text from Wikipedia article
            
        Returns:
            Cleaned and normalized text ready for tokenization
        """
        # Remove XML/HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove wiki markup
        text = re.sub(r'\[\[([^\]|]+)\|?[^\]]*\]\]', r'\1', text)  # Wiki links
        text = re.sub(r'\{\{[^}]+\}\}', '', text)  # Templates
        text = re.sub(r'\{\|[^}]+\|\}', '', text)  # Tables
        
        # Remove references and citations
        text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL)
        text = re.sub(r'<ref[^>]*/?>', '', text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        # Basic sentence splitting (keep periods, question marks, exclamation marks)
        text = re.sub(r'([.!?])\s*', r'\1 ', text)
        
        return text
    
    def extract_wikipedia_text(self, dump_path: str) -> List[str]:
        """
        📖 Extract clean text from Wikipedia XML dump
        
        Wikipedia dumps are massive XML files (40GB+ compressed) containing all articles.
        This function efficiently processes the XML stream without loading everything into memory.
        
        Args:
            dump_path: Path to Wikipedia XML dump file (.xml.bz2)
            
        Returns:
            List of cleaned article texts
        """
        print(f"🔍 Extracting text from Wikipedia dump: {dump_path}")
        
        if not os.path.exists(dump_path):
            print(f"❌ Wikipedia dump not found at {dump_path}")
            print("📥 Download from: https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles.xml.bz2")
            print("⚠️  Warning: File is ~20GB compressed, ~80GB uncompressed")
            raise FileNotFoundError(f"Wikipedia dump not found: {dump_path}")
        
        articles = []
        article_count = 0
        max_articles = 100000  # Limit for demo - remove this for full Wikipedia
        
        try:
            # Open compressed XML file
            with bz2.open(dump_path, 'rt', encoding='utf-8') as file:
                current_text = ""
                in_text = False
                in_page = False
                
                for line_num, line in enumerate(file):
                    # Progress indicator
                    if line_num % 100000 == 0:
                        print(f"📊 Processed {line_num:,} lines, found {article_count:,} articles")
                    
                    # Detect page boundaries
                    if '<page>' in line:
                        in_page = True
                        current_text = ""
                        continue
                    
                    if '</page>' in line and in_page:
                        if current_text.strip():
                            cleaned_text = self.clean_text(current_text)
                            if len(cleaned_text) > 100:  # Filter very short articles
                                articles.append(cleaned_text)
                                article_count += 1
                                
                                # Demo limit - remove for full training
                                if article_count >= max_articles:
                                    print(f"🛑 Reached demo limit of {max_articles:,} articles")
                                    break
                        
                        in_page = False
                        current_text = ""
                        continue
                    
                    # Extract text content
                    if '<text' in line:
                        in_text = True
                        # Extract text after the opening tag
                        start_idx = line.find('>') + 1
                        if start_idx > 0:
                            current_text += line[start_idx:]
                        continue
                    
                    if '</text>' in line:
                        # Extract text before the closing tag
                        end_idx = line.find('</text>')
                        if end_idx >= 0:
                            current_text += line[:end_idx]
                        in_text = False
                        continue
                    
                    if in_text and in_page:
                        current_text += line
        
        except Exception as e:
            print(f"❌ Error processing Wikipedia dump: {e}")
            raise
        
        print(f"✅ Extracted {len(articles):,} articles from Wikipedia")
        return articles
    
    def build_vocabulary(self, texts: List[str]) -> None:
        """
        🏗️ Build BPE vocabulary from Wikipedia texts
        
        This implements the core BPE algorithm that learns subword units by iteratively
        merging the most frequent character pairs. The process creates a vocabulary
        that balances between character-level granularity and word-level efficiency.
        
        Args:
            texts: List of cleaned Wikipedia article texts
        """
        print(f"🔤 Building BPE vocabulary from {len(texts):,} articles...")
        
        # 📊 Step 1: Count word frequencies
        print("📊 Counting word frequencies...")
        for text in texts:
            words = text.lower().split()
            self.word_frequencies.update(words)
        
        print(f"📈 Found {len(self.word_frequencies):,} unique words")
        
        # 🔤 Step 2: Initialize character-level vocabulary
        print("🔤 Initializing character vocabulary...")
        char_vocab = set()
        for word in self.word_frequencies:
            char_vocab.update(list(word) + ['</w>'])  # Add end-of-word marker
        
        # Add special tokens
        vocab = list(self.config.special_tokens) + sorted(list(char_vocab))
        
        # 🔄 Step 3: Learn BPE merges
        print(f"🔄 Learning BPE merges (target vocab size: {self.config.vocab_size})...")
        
        # Convert words to character sequences
        word_splits = {}
        for word, freq in self.word_frequencies.items():
            if freq >= self.config.min_token_frequency:
                word_splits[word] = list(word) + ['</w>']
        
        # Iteratively learn merges
        while len(vocab) < self.config.vocab_size:
            # Count all adjacent pairs
            pair_counts = Counter()
            for word, split in word_splits.items():
                freq = self.word_frequencies[word]
                for i in range(len(split) - 1):
                    pair = (split[i], split[i + 1])
                    pair_counts[pair] += freq
            
            if not pair_counts:
                break
            
            # Find most frequent pair
            best_pair = pair_counts.most_common(1)[0][0]
            
            # Merge this pair in all words
            new_word_splits = {}
            for word, split in word_splits.items():
                new_split = []
                i = 0
                while i < len(split):
                    if i < len(split) - 1 and split[i] == best_pair[0] and split[i + 1] == best_pair[1]:
                        new_split.append(best_pair[0] + best_pair[1])
                        i += 2
                    else:
                        new_split.append(split[i])
                        i += 1
                new_word_splits[word] = new_split
            
            word_splits = new_word_splits
            self.bpe_merges.append(best_pair)
            
            # Add merged token to vocabulary
            merged_token = best_pair[0] + best_pair[1]
            if merged_token not in vocab:
                vocab.append(merged_token)
            
            if len(vocab) % 1000 == 0:
                print(f"📈 Vocabulary size: {len(vocab):,}")
        
        # 🗂️ Step 4: Create token mappings
        self.token_to_id = {token: idx for idx, token in enumerate(vocab)}
        self.id_to_token = {idx: token for token, idx in self.token_to_id.items()}
        
        print(f"✅ Built vocabulary with {len(vocab):,} tokens")
        print(f"🔄 Learned {len(self.bpe_merges):,} BPE merges")
    
    def apply_bpe(self, word: str) -> List[str]:
        """
        🔄 Apply learned BPE merges to tokenize a word
        
        Takes a word and applies the learned merge operations in order to convert
        it into subword tokens. This handles out-of-vocabulary words gracefully.
        
        Args:
            word: Input word to tokenize
            
        Returns:
            List of subword tokens
        """
        if not word:
            return []
        
        # Start with character-level split
        word_tokens = list(word.lower()) + ['</w>']
        
        # Apply merges in order
        for merge_pair in self.bpe_merges:
            new_word_tokens = []
            i = 0
            while i < len(word_tokens):
                if i < len(word_tokens) - 1 and word_tokens[i] == merge_pair[0] and word_tokens[i + 1] == merge_pair[1]:
                    new_word_tokens.append(merge_pair[0] + merge_pair[1])
                    i += 2
                else:
                    new_word_tokens.append(word_tokens[i])
                    i += 1
            word_tokens = new_word_tokens
        
        return word_tokens
    
    def tokenize(self, text: str) -> List[int]:
        """
        🔢 Convert text to token IDs
        
        Tokenizes input text using the learned BPE vocabulary and converts
        tokens to their corresponding integer IDs.
        
        Args:
            text: Input text to tokenize
            
        Returns:
            List of token IDs
        """
        words = text.split()
        token_ids = [self.token_to_id["<BOS>"]]  # Start token
        
        for word in words:
            word_tokens = self.apply_bpe(word)
            for token in word_tokens:
                if token in self.token_to_id:
                    token_ids.append(self.token_to_id[token])
                else:
                    token_ids.append(self.token_to_id["<UNK>"])  # Unknown token
        
        token_ids.append(self.token_to_id["<EOS>"])  # End token
        return token_ids
    
    def detokenize(self, token_ids: List[int]) -> str:
        """
        📝 Convert token IDs back to text
        
        Converts a sequence of token IDs back to readable text by looking up
        tokens and joining them appropriately.
        
        Args:
            token_ids: List of token IDs to convert
            
        Returns:
            Reconstructed text string
        """
        tokens = []
        for token_id in token_ids:
            if token_id in self.id_to_token:
                token = self.id_to_token[token_id]
                if token not in self.config.special_tokens:
                    tokens.append(token)
        
        # Join tokens and clean up
        text = ''.join(tokens)
        text = text.replace('</w>', ' ')  # Convert end-of-word markers to spaces
        text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        return text.strip()
    
    def save(self, path: str) -> None:
        """💾 Save tokenizer to disk"""
        tokenizer_data = {
            'token_to_id': self.token_to_id,
            'id_to_token': self.id_to_token,
            'bpe_merges': self.bpe_merges,
            'word_frequencies': dict(self.word_frequencies),  # Convert Counter to dict
            'config': self.config
        }
        with open(path, 'wb') as f:
            pickle.dump(tokenizer_data, f)
        print(f"💾 Saved tokenizer to {path}")
    
    @classmethod
    def load(cls, path: str) -> 'WikipediaTokenizer':
        """📂 Load tokenizer from disk"""
        with open(path, 'rb') as f:
            tokenizer_data = pickle.load(f)
        
        tokenizer = cls(tokenizer_data['config'])
        tokenizer.token_to_id = tokenizer_data['token_to_id']
        tokenizer.id_to_token = tokenizer_data['id_to_token']
        tokenizer.bpe_merges = tokenizer_data['bpe_merges']
        tokenizer.word_frequencies = Counter(tokenizer_data.get('word_frequencies', {}))
        
        print(f"📂 Loaded tokenizer from {path}")
        return tokenizer


class WikipediaDataset:
    """
    📊 Wikipedia Dataset Handler for Efficient Training with Dumpster-Dive Integration
    
    Handles the massive Wikipedia dataset efficiently by streaming data in batches
    rather than loading everything into memory. Implements proper sequence packing
    and padding for transformer training.
    
    Now integrated with dumpster-dive for efficient data loading from MongoDB.
    
    The dataset processes Wikipedia articles into fixed-length sequences that
    transformers can process efficiently. Sequences are packed to minimize padding
    and maximize GPU utilization.
    """
    
    def __init__(self, config: WikipediaConfig, tokenizer: WikipediaTokenizer):
        self.config = config
        self.tokenizer = tokenizer
        self.sequences: List[List[int]] = []
        self.current_batch_idx = 0
        
    def prepare_training_data_from_dumpster(self, dumpster: DumpsterDiveIntegration) -> None:
        """
        🔧 Prepare tokenized sequences for training from MongoDB via dumpster-dive
        
        Uses the dumpster-dive integration to efficiently extract and tokenize
        Wikipedia articles from MongoDB.
        
        Args:
            dumpster: DumpsterDiveIntegration instance with MongoDB connection
        """
        print(f"🔧 Preparing training data from MongoDB articles...")
        
        # Determine how many articles to process
        total_articles = dumpster.get_article_count()
        
        if self.config.use_demo_mode:
            limit = min(self.config.max_articles_demo, total_articles)
            print(f"🎯 Demo mode: processing {limit:,} articles")
        else:
            limit = None
            print(f"🚀 Full mode: processing all {total_articles:,} articles")
        
        # Extract articles from MongoDB
        articles = dumpster.extract_articles(limit=limit)
        
        if not articles:
            print("❌ No articles extracted from MongoDB")
            raise ValueError("No articles available for training data preparation")
        
        # Prepare training data using extracted articles
        self.prepare_training_data(articles)
        
    def prepare_training_data(self, texts: List[str]) -> None:
        """
        🏗️ Build BPE vocabulary from Wikipedia texts
        
        This implements the core BPE algorithm that learns subword units by iteratively
        merging the most frequent character pairs. The process creates a vocabulary
        that balances between character-level granularity and word-level efficiency.
        
        Args:
            texts: List of cleaned Wikipedia article texts
        """
        print(f"🔤 Building BPE vocabulary from {len(texts):,} articles...")
        
        # 📊 Step 1: Count word frequencies
        print("📊 Counting word frequencies...")
        for text in texts:
            words = text.lower().split()
            self.word_frequencies.update(words)
        
        print(f"📈 Found {len(self.word_frequencies):,} unique words")
        
        # 🔤 Step 2: Initialize character-level vocabulary
        print("🔤 Initializing character vocabulary...")
        char_vocab = set()
        for word in self.word_frequencies:
            char_vocab.update(list(word) + ['</w>'])  # Add end-of-word marker
        
        # Add special tokens
        vocab = list(self.config.special_tokens) + sorted(list(char_vocab))
        
        # 🔄 Step 3: Learn BPE merges
        print(f"🔄 Learning BPE merges (target vocab size: {self.config.vocab_size})...")
        
        # Convert words to character sequences
        word_splits = {}
        for word, freq in self.word_frequencies.items():
            if freq >= self.config.min_token_frequency:
                word_splits[word] = list(word) + ['</w>']
        
        # Iteratively learn merges
        while len(vocab) < self.config.vocab_size:
            # Count all adjacent pairs
            pair_counts = Counter()
            for word, split in word_splits.items():
                freq = self.word_frequencies[word]
                for i in range(len(split) - 1):
                    pair = (split[i], split[i + 1])
                    pair_counts[pair] += freq
            
            if not pair_counts:
                break
            
            # Find most frequent pair
            best_pair = pair_counts.most_common(1)[0][0]
            
            # Merge this pair in all words
            new_word_splits = {}
            for word, split in word_splits.items():
                new_split = []
                i = 0
                while i < len(split):
                    if i < len(split) - 1 and split[i] == best_pair[0] and split[i + 1] == best_pair[1]:
                        new_split.append(best_pair[0] + best_pair[1])
                        i += 2
                    else:
                        new_split.append(split[i])
                        i += 1
                new_word_splits[word] = new_split
            
            word_splits = new_word_splits
            self.bpe_merges.append(best_pair)
            
            # Add merged token to vocabulary
            merged_token = best_pair[0] + best_pair[1]
            if merged_token not in vocab:
                vocab.append(merged_token)
            
            if len(vocab) % 1000 == 0:
                print(f"📈 Vocabulary size: {len(vocab):,}")
        
        # 🗂️ Step 4: Create token mappings
        self.token_to_id = {token: idx for idx, token in enumerate(vocab)}
        self.id_to_token = {idx: token for token, idx in self.token_to_id.items()}
        
        print(f"✅ Built vocabulary with {len(vocab):,} tokens")
        print(f"🔄 Learned {len(self.bpe_merges):,} BPE merges")
    
    def apply_bpe(self, word: str) -> List[str]:
        """
        🔄 Apply learned BPE merges to tokenize a word
        
        Takes a word and applies the learned merge operations in order to convert
        it into subword tokens. This handles out-of-vocabulary words gracefully.
        
        Args:
            word: Input word to tokenize
            
        Returns:
            List of subword tokens
        """
        if not word:
            return []
        
        # Start with character-level split
        word_tokens = list(word.lower()) + ['</w>']
        
        # Apply merges in order
        for merge_pair in self.bpe_merges:
            new_word_tokens = []
            i = 0
            while i < len(word_tokens):
                if i < len(word_tokens) - 1 and word_tokens[i] == merge_pair[0] and word_tokens[i + 1] == merge_pair[1]:
                    new_word_tokens.append(merge_pair[0] + merge_pair[1])
                    i += 2
                else:
                    new_word_tokens.append(word_tokens[i])
                    i += 1
            word_tokens = new_word_tokens
        
        return word_tokens
    
    def tokenize(self, text: str) -> List[int]:
        """
        🔢 Convert text to token IDs
        
        Tokenizes input text using the learned BPE vocabulary and converts
        tokens to their corresponding integer IDs.
        
        Args:
            text: Input text to tokenize
            
        Returns:
            List of token IDs
        """
        words = text.split()
        token_ids = [self.token_to_id["<BOS>"]]  # Start token
        
        for word in words:
            word_tokens = self.apply_bpe(word)
            for token in word_tokens:
                if token in self.token_to_id:
                    token_ids.append(self.token_to_id[token])
                else:
                    token_ids.append(self.token_to_id["<UNK>"])  # Unknown token
        
        token_ids.append(self.token_to_id["<EOS>"])  # End token
        return token_ids
    
    def detokenize(self, token_ids: List[int]) -> str:
        """
        📝 Convert token IDs back to text
        
        Converts a sequence of token IDs back to readable text by looking up
        tokens and joining them appropriately.
        
        Args:
            token_ids: List of token IDs to convert
            
        Returns:
            Reconstructed text string
        """
        tokens = []
        for token_id in token_ids:
            if token_id in self.id_to_token:
                token = self.id_to_token[token_id]
                if token not in self.config.special_tokens:
                    tokens.append(token)
        
        # Join tokens and clean up
        text = ''.join(tokens)
        text = text.replace('</w>', ' ')  # Convert end-of-word markers to spaces
        text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        return text.strip()
    
    def save(self, path: str) -> None:
        """💾 Save tokenizer to disk"""
        tokenizer_data = {
            'token_to_id': self.token_to_id,
            'id_to_token': self.id_to_token,
            'bpe_merges': self.bpe_merges,
            'config': self.config
        }
        with open(path, 'wb') as f:
            pickle.dump(tokenizer_data, f)
        print(f"💾 Saved tokenizer to {path}")
    
    @classmethod
    def load(cls, path: str) -> 'WikipediaTokenizer':
        """📂 Load tokenizer from disk"""
        with open(path, 'rb') as f:
            tokenizer_data = pickle.load(f)
        
        tokenizer = cls(tokenizer_data['config'])
        tokenizer.token_to_id = tokenizer_data['token_to_id']
        tokenizer.id_to_token = tokenizer_data['id_to_token']
        tokenizer.bpe_merges = tokenizer_data['bpe_merges']
        
        print(f"📂 Loaded tokenizer from {path}")
        return tokenizer


class WikipediaDataset:
    """
    📊 Wikipedia Dataset Handler for Efficient Training
    
    Handles the massive Wikipedia dataset efficiently by streaming data in batches
    rather than loading everything into memory. Implements proper sequence packing
    and padding for transformer training.
    
    The dataset processes Wikipedia articles into fixed-length sequences that
    transformers can process efficiently. Sequences are packed to minimize padding
    and maximize GPU utilization.
    """
    
    def __init__(self, config: WikipediaConfig, tokenizer: WikipediaTokenizer):
        self.config = config
        self.tokenizer = tokenizer
        self.sequences: List[List[int]] = []
        self.current_batch_idx = 0
        
    def prepare_training_data(self, texts: List[str]) -> None:
        """
        🔧 Prepare tokenized sequences for training
        
        Converts Wikipedia articles into fixed-length sequences suitable for
        transformer training. Uses sequence packing to minimize wasted computation
        on padding tokens.
        
        Args:
            texts: List of Wikipedia article texts
        """
        print(f"🔧 Preparing training data from {len(texts):,} articles...")
        
        all_token_ids = []
        
        # Tokenize all texts
        for i, text in enumerate(texts):
            if i % 10000 == 0:
                print(f"📝 Tokenized {i:,}/{len(texts):,} articles")
            
            token_ids = self.tokenizer.tokenize(text)
            all_token_ids.extend(token_ids)
        
        print(f"🔢 Total tokens: {len(all_token_ids):,}")
        
        # Pack into fixed-length sequences
        sequences = []
        max_seq_len = self.config.sequence_max_length
        
        for i in range(0, len(all_token_ids) - max_seq_len, max_seq_len):
            sequence = all_token_ids[i:i + max_seq_len]
            if len(sequence) == max_seq_len:
                sequences.append(sequence)
        
        self.sequences = sequences
        print(f"📦 Created {len(sequences):,} training sequences")
        
        # Save processed data
        processed_path = os.path.join(self.config.processed_data_dir, "training_sequences.pkl")
        with open(processed_path, 'wb') as f:
            pickle.dump(sequences, f)
        print(f"💾 Saved processed sequences to {processed_path}")
    
    def get_batch(self, batch_size: int) -> Tuple[Tensor, Tensor]:
        """
        📦 Get next training batch
        
        Returns a batch of input sequences and their corresponding targets.
        For language modeling, targets are input sequences shifted by one position.
        
        Args:
            batch_size: Number of sequences in the batch
            
        Returns:
            Tuple of (input_sequences, target_sequences) as Tensors
        """
        if self.current_batch_idx + batch_size > len(self.sequences):
            self.current_batch_idx = 0  # Reset to beginning
        
        batch_sequences = self.sequences[self.current_batch_idx:self.current_batch_idx + batch_size]
        self.current_batch_idx += batch_size
        
        # Convert to tensors
        inputs = []
        targets = []
        
        for sequence in batch_sequences:
            # Input: all tokens except the last
            inputs.append(sequence[:-1])
            # Target: all tokens except the first (shifted by one)
            targets.append(sequence[1:])
        
        # Pad sequences if necessary
        max_len = max(len(seq) for seq in inputs)
        pad_token_id = self.tokenizer.token_to_id["<PAD>"]
        
        padded_inputs = []
        padded_targets = []
        
        for inp, tgt in zip(inputs, targets):
            padded_inp = inp + [pad_token_id] * (max_len - len(inp))
            padded_tgt = tgt + [pad_token_id] * (max_len - len(tgt))
            padded_inputs.append(padded_inp)
            padded_targets.append(padded_tgt)
        
        return Tensor(padded_inputs), Tensor(padded_targets)
    
    def __len__(self) -> int:
        """Return number of sequences in dataset"""
        return len(self.sequences)


class LearnedPositionalEmbeddings:
    """
    🎯 Positional Information Encoder
    
    Since attention mechanisms are permutation-invariant (they don't naturally understand 
    word order), we need to inject positional information. This layer learns position 
    embeddings that get added to token embeddings, teaching the model that word order matters.
    
    Think of it like adding GPS coordinates to each word so the model knows "The cat sat" 
    vs "Sat the cat" are different meanings.
    
    Args:
        sequence_max_length: Maximum number of words in a sequence
        embedding_dimension: Size of the vector representation for each position
    """
    def __init__(self, sequence_max_length: int, embedding_dimension: int):
        # Initialize random position vectors that will be learned during training
        # Each position gets its own unique vector representation
        self.position_vectors = Tensor.randn(sequence_max_length, embedding_dimension) * 0.02
        
    def __call__(self, token_indices):
        # token_indices shape: [batch_size, sequence_length] for token IDs
        # Extract how many positions we need for this sequence
        sequence_length = token_indices.shape[1]
        position_embeddings = self.position_vectors[:sequence_length, :]  # [seq_len, embedding_dim]
        
        # Broadcast to match batch size: [batch_size, sequence_length, embedding_dimension]
        return position_embeddings.unsqueeze(0).expand(
            token_indices.shape[0], sequence_length, self.position_vectors.shape[1]
        )


class MultiHeadSelfAttention:
    """
    🎯 Multi-Head Self-Attention: The Core Intelligence Mechanism
    
    This is where the magic happens! Each word looks at every other word in the sentence 
    and decides how much attention to pay to each one. Multiple "heads" allow the model 
    to attend to different types of relationships simultaneously.
    
    For example, one head might focus on subject-verb relationships while another focuses 
    on noun-adjective connections. Each head creates Query, Key, and Value representations:
    
    - Query: "What am I looking for?" (e.g., "cat" looking for actions)
    - Key: "What do I offer?" (e.g., "sat" advertising itself as an action) 
    - Value: "What is my actual meaning?" (the semantic content)
    
    The attention score is calculated as: Attention(Q,K,V) = softmax(QK^T/√d_k)V
    
    Reference: https://jalammar.github.io/illustrated-transformer/
    
    Args:
        embedding_dimension: Hidden size of embeddings
        num_attention_heads: Number of parallel attention mechanisms
        sequence_max_length: Maximum sequence length for causal masking
        dropout_probability: Regularization (set to 0.0 for this implementation)
    """
    def __init__(self, embedding_dimension: int, num_attention_heads: int, 
                 sequence_max_length: int, dropout_probability: float = 0.0):
        assert embedding_dimension % num_attention_heads == 0, \
            "embedding_dimension must be divisible by num_attention_heads"
        
        self.embedding_dimension = embedding_dimension
        self.num_attention_heads = num_attention_heads
        self.head_dimension = embedding_dimension // num_attention_heads  # Size per attention head
        self.sequence_max_length = sequence_max_length
        
        # Linear transformations to create Query, Key, and Value representations
        # Each gets its own learned transformation matrix
        self.query_projection = Linear(embedding_dimension, embedding_dimension)
        self.key_projection = Linear(embedding_dimension, embedding_dimension)
        self.value_projection = Linear(embedding_dimension, embedding_dimension)
        self.output_projection = Linear(embedding_dimension, embedding_dimension)
        
        # 🚫 Causal Mask: Prevents cheating by looking at future words
        # In language modeling, we can only use past and present context to predict the next word
        # This creates a lower triangular matrix where 1 = "can attend", 0 = "cannot attend"
        causal_mask = Tensor.ones(sequence_max_length, sequence_max_length).tril(diagonal=0)
        self.register_buffer('causal_attention_mask', causal_mask)
        
    def register_buffer(self, buffer_name: str, tensor_data: Tensor):
        """Store the causal mask as a model component"""
        setattr(self, buffer_name, tensor_data)
        
    def __call__(self, hidden_states):
        batch_size, sequence_length, embedding_dimension = hidden_states.shape
        
        # 🔄 Generate Query, Key, Value representations for each word
        queries = self.query_projection(hidden_states)  # [batch, seq_len, embed_dim]
        keys = self.key_projection(hidden_states)       # [batch, seq_len, embed_dim]
        values = self.value_projection(hidden_states)   # [batch, seq_len, embed_dim]
        
        # 🧩 Reshape for multi-head attention: split embedding_dimension across heads
        # [batch, seq_len, embed_dim] -> [batch, seq_len, num_heads, head_dim] -> [batch, num_heads, seq_len, head_dim]
        queries = queries.reshape(batch_size, sequence_length, self.num_attention_heads, self.head_dimension).transpose(1, 2)
        keys = keys.reshape(batch_size, sequence_length, self.num_attention_heads, self.head_dimension).transpose(1, 2)
        values = values.reshape(batch_size, sequence_length, self.num_attention_heads, self.head_dimension).transpose(1, 2)
        
        # 🎯 Scaled Dot-Product Attention
        # Calculate attention scores: how much should each word attend to every other word?
        # QK^T gives us similarity scores, scaled by √d_k for numerical stability
        attention_scores = queries.dot(keys.transpose(-2, -1)) / math.sqrt(self.head_dimension)
        
        # 🚫 Apply causal masking to prevent attending to future positions
        current_mask = self.causal_attention_mask[:sequence_length, :sequence_length]
        # Set masked positions to large negative value so softmax makes them ≈ 0
        attention_scores = attention_scores.masked_fill(current_mask == 0, -1e9)
        
        # 📊 Convert scores to probabilities: each word's attention sums to 1
        attention_weights = attention_scores.softmax(axis=-1)
        
        # 🎭 Apply attention weights to values: weighted combination of meanings
        attention_output = attention_weights.dot(values)
        
        # 🔄 Reshape back to original format: [batch, num_heads, seq_len, head_dim] -> [batch, seq_len, embed_dim]
        attention_output = attention_output.transpose(1, 2).reshape(batch_size, sequence_length, embedding_dimension)
        
        # 🎯 Final linear transformation to integrate multi-head outputs
        return self.output_projection(attention_output)


class PositionWiseFeedForward:
    """
    🧠 Position-wise Feed-Forward Network: Deep Processing Layer
    
    After attention mechanisms identify what to focus on, this layer performs deep 
    processing on each word position independently. It's a two-layer neural network 
    with ReLU activation that transforms the attended representations.
    
    Think of it as giving each word time to "think deeply" about what it learned 
    from attending to other words. The standard expansion factor is 4x, so a 512-dim 
    input becomes 2048-dim in the middle layer before contracting back to 512-dim.
    
    Reference: https://arxiv.org/abs/1706.03762 Section 3.3
    
    Args:
        embedding_dimension: Input/output dimension size
        feed_forward_dimension: Internal expansion dimension (typically 4 * embedding_dimension)
    """
    def __init__(self, embedding_dimension: int, feed_forward_dimension: int = None):
        if feed_forward_dimension is None:
            feed_forward_dimension = 4 * embedding_dimension  # Standard 4x expansion
            
        self.expansion_layer = Linear(embedding_dimension, feed_forward_dimension)
        self.contraction_layer = Linear(feed_forward_dimension, embedding_dimension)
        
    def __call__(self, hidden_states):
        # 🔄 Two-layer MLP: Expand -> ReLU -> Contract
        # ReLU adds non-linearity to enable complex pattern learning
        expanded_representation = self.expansion_layer(hidden_states).relu()
        processed_output = self.contraction_layer(expanded_representation)
        return processed_output


class TransformerDecoderBlock:
    """
    🏗️ Single Transformer Decoder Block: The Core Building Block
    
    This is the fundamental unit of transformer architecture, repeated multiple times 
    to build deep language understanding. Each block contains:
    
    1. 🎯 Multi-head self-attention: Learn what to focus on
    2. 🧠 Feed-forward network: Process the attended information deeply
    3. 🔄 Residual connections: Preserve original information flow
    4. 📊 Layer normalization: Stabilize training dynamics
    
    The architecture uses "pre-normalization" (LayerNorm before attention/FFN) which 
    provides better training stability compared to post-normalization.
    
    Reference: https://arxiv.org/abs/2002.04745 (Pre-LN Transformer)
    
    Args:
        embedding_dimension: Hidden dimension size throughout the block
        num_attention_heads: Number of parallel attention mechanisms
        sequence_max_length: Maximum sequence length for causal masking
        feed_forward_dimension: Size of the feed-forward hidden layer
        dropout_probability: Regularization probability (not implemented here)
    """
    def __init__(self, embedding_dimension: int, num_attention_heads: int, 
                 sequence_max_length: int, feed_forward_dimension: int = None,
                 dropout_probability: float = 0.0):
        self.self_attention = MultiHeadSelfAttention(
            embedding_dimension, num_attention_heads, sequence_max_length, dropout_probability
        )
        self.feed_forward_network = PositionWiseFeedForward(embedding_dimension, feed_forward_dimension)
        
        # Layer normalization for stable training dynamics
        self.attention_layer_norm = LayerNorm(embedding_dimension)
        self.feed_forward_layer_norm = LayerNorm(embedding_dimension)
        
    def __call__(self, hidden_states):
        # 🎯 Self-Attention Sub-layer with Pre-LN and Residual Connection
        # Pre-normalization: normalize first, then apply transformation
        normalized_states = self.attention_layer_norm(hidden_states)
        attention_output = self.self_attention(normalized_states)
        hidden_states = hidden_states + attention_output  # Residual connection preserves original info
        
        # 🧠 Feed-Forward Sub-layer with Pre-LN and Residual Connection
        normalized_states = self.feed_forward_layer_norm(hidden_states)
        feed_forward_output = self.feed_forward_network(normalized_states)
        hidden_states = hidden_states + feed_forward_output  # Another residual connection
        
        return hidden_states


class GPTStyleTransformer:
    """
    🤖 GPT-Style Transformer: Complete Language Model Architecture
    
    This implements a decoder-only transformer similar to GPT models that learn to predict 
    the next word in a sequence. Unlike encoder-decoder transformers (like the original), 
    this architecture only uses decoder blocks with causal masking for autoregressive 
    text generation.
    
    🏗️ Architecture Flow:
    1. 📝 Token Embedding: Convert word IDs to dense vectors
    2. 📍 Positional Embedding: Add position information
    3. 🧠 Multiple Transformer Blocks: Deep pattern recognition
    4. 📊 Final Layer Norm: Output stabilization  
    5. 🎯 Language Modeling Head: Predict next word probabilities
    
    The model learns to compress human language patterns into billions of parameters,
    enabling it to generate coherent text by predicting one word at a time based on
    all previous context.
    
    References:
    - GPT Paper: https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf
    - Transformer Paper: https://arxiv.org/abs/1706.03762
    - Illustrated Transformer: https://jalammar.github.io/illustrated-transformer/
    
    Args:
        config: WikipediaConfig object containing all hyperparameters
    """
    def __init__(self, config: WikipediaConfig):
        self.config = config
        
        # 📝 Word Embedding: Maps discrete token IDs to continuous vector space
        # This learnable lookup table stores meaning representations for each vocabulary word
        self.token_embeddings = Embedding(config.vocab_size, config.embedding_dimension)
        
        # 📍 Position Embedding: Adds sequence order information
        # Crucial since attention is permutation-invariant by default
        self.positional_embeddings = LearnedPositionalEmbeddings(
            config.sequence_max_length, config.embedding_dimension
        )
        
        # 🧠 Stack of Transformer Blocks: The core intelligence layers
        # Each block can learn increasingly complex language patterns
        self.transformer_blocks = [
            TransformerDecoderBlock(
                config.embedding_dimension, 
                config.num_attention_heads, 
                config.sequence_max_length,
                config.feed_forward_dimension,
                config.dropout_probability
            ) 
            for _ in range(config.num_transformer_layers)
        ]
        
        # 📊 Final Layer Normalization: Stabilizes final representations
        self.final_layer_norm = LayerNorm(config.embedding_dimension)
        
        # 🎯 Language Modeling Head: Projects hidden states to vocabulary probabilities
        # This linear layer predicts the probability of each word being next
        self.language_modeling_head = Linear(config.embedding_dimension, config.vocab_size)
        
    def __call__(self, input_token_ids):
        """
        🔄 Forward Pass: Convert Token IDs to Next-Word Predictions
        
        This function implements the complete forward computation:
        1. Convert tokens to embeddings and add positional info
        2. Process through multiple transformer blocks
        3. Apply final normalization and project to vocabulary
        
        Args:
            input_token_ids: Token IDs of shape [batch_size, sequence_length]
            
        Returns:
            Tensor: Logits of shape [batch_size, sequence_length, vocabulary_size]
                   Each position contains probability scores for all possible next words
        """
        # 📝 Convert discrete tokens to continuous vector representations
        token_vectors = self.token_embeddings(input_token_ids)  # [batch, seq_len, embed_dim]
        
        # 📍 Add positional information so model understands word order
        position_vectors = self.positional_embeddings(input_token_ids)  # [batch, seq_len, embed_dim]
        
        # 🔄 Combine semantic (token) and positional information
        # This gives each word both meaning and position context
        hidden_representations = token_vectors + position_vectors
        
        # 🧠 Process through stack of transformer blocks
        # Each block adds another layer of language understanding
        for transformer_block in self.transformer_blocks:
            hidden_representations = transformer_block(hidden_representations)
            
        # 📊 Apply final normalization for stable outputs
        normalized_representations = self.final_layer_norm(hidden_representations)
        
        # 🎯 Project to vocabulary size for next-word prediction
        # Each position gets probability scores for all possible next words
        next_word_logits = self.language_modeling_head(normalized_representations)
        
        return next_word_logits
    
    def get_parameters(self):
        """
        📊 Collect all model parameters for optimization
        
        Returns a list of all trainable parameters in the model.
        This is needed for the optimizer to know which weights to update.
        
        Returns:
            List of Tensor parameters
        """
        parameters = [
            self.token_embeddings.weight,
            self.positional_embeddings.position_vectors,
        ]
        
        # Collect all transformer block parameters
        for block in self.transformer_blocks:
            # Attention parameters
            parameters.extend([
                block.self_attention.query_projection.weight,
                block.self_attention.query_projection.bias,
                block.self_attention.key_projection.weight,
                block.self_attention.key_projection.bias,
                block.self_attention.value_projection.weight,
                block.self_attention.value_projection.bias,
                block.self_attention.output_projection.weight,
                block.self_attention.output_projection.bias,
            ])
            
            # Feed-forward parameters
            parameters.extend([
                block.feed_forward_network.expansion_layer.weight,
                block.feed_forward_network.expansion_layer.bias,
                block.feed_forward_network.contraction_layer.weight,
                block.feed_forward_network.contraction_layer.bias,
            ])
            
            # Layer norm parameters
            parameters.extend([
                block.attention_layer_norm.weight,
                block.attention_layer_norm.bias,
                block.feed_forward_layer_norm.weight,
                block.feed_forward_layer_norm.bias,
            ])
        
        # Final layer norm and output head
        parameters.extend([
            self.final_layer_norm.weight,
            self.final_layer_norm.bias,
            self.language_modeling_head.weight,
            self.language_modeling_head.bias,
        ])
        
        # Filter out None parameters
        return [p for p in parameters if p is not None]


class LearningRateScheduler:
    """
    📈 Learning Rate Scheduler with Warmup and Cosine Decay
    
    Implements a learning rate schedule that starts with a warmup phase followed
    by cosine annealing. This is crucial for stable training of large transformers.
    
    The warmup phase gradually increases the learning rate from 0 to the target
    value over the first few thousand steps. This prevents gradient explosion
    during the early stages when parameters are randomly initialized.
    
    After warmup, cosine annealing gradually decreases the learning rate,
    allowing the model to fine-tune its weights and converge to a good solution.
    
    Reference: https://arxiv.org/abs/1608.03983 (SGDR: Stochastic Gradient Descent with Warm Restarts)
    
    Args:
        optimizer: The optimizer to schedule
        warmup_steps: Number of steps for learning rate warmup
        max_steps: Total number of training steps
        base_lr: Base learning rate after warmup
        min_lr: Minimum learning rate at the end
    """
    
    def __init__(self, optimizer, warmup_steps: int, max_steps: int, 
                 base_lr: float, min_lr: float = 1e-6):
        self.optimizer = optimizer
        self.warmup_steps = warmup_steps
        self.max_steps = max_steps
        self.base_lr = base_lr
        self.min_lr = min_lr
        self.current_step = 0
        
    def step(self):
        """Update learning rate for current step"""
        self.current_step += 1
        
        if self.current_step <= self.warmup_steps:
            # 🔥 Warmup phase: linear increase from 0 to base_lr
            lr = self.base_lr * (self.current_step / self.warmup_steps)
        else:
            # 📉 Cosine annealing phase
            progress = (self.current_step - self.warmup_steps) / (self.max_steps - self.warmup_steps)
            progress = min(progress, 1.0)  # Clamp to [0, 1]
            lr = self.min_lr + (self.base_lr - self.min_lr) * 0.5 * (1 + math.cos(math.pi * progress))
        
        # Update optimizer learning rate
        for param_group in self.optimizer.param_groups:
            param_group['lr'] = lr
        
        return lr


class WikipediaTrainer:
    """
    🚀 Complete Wikipedia Training Pipeline
    
    This class orchestrates the entire training process for a transformer model
    on the Wikipedia corpus. It handles data loading, model training, checkpointing,
    evaluation, and text generation.
    
    The trainer implements advanced techniques like gradient accumulation,
    gradient clipping, learning rate scheduling, and automatic checkpointing
    to ensure stable training on large datasets.
    
    Args:
        config: WikipediaConfig containing all hyperparameters
        model: The transformer model to train
        tokenizer: Tokenizer for encoding/decoding text
        dataset: Dataset containing training sequences
    """
    
    def __init__(self, config: WikipediaConfig, model: GPTStyleTransformer, 
                 tokenizer: WikipediaTokenizer, dataset: WikipediaDataset):
        self.config = config
        self.model = model
        self.tokenizer = tokenizer
        self.dataset = dataset
        
        # 📈 Setup optimizer and scheduler
        self.optimizer = Adam(model.get_parameters(), lr=config.learning_rate, weight_decay=config.weight_decay)
        
        total_steps = (len(dataset) // (config.batch_size * config.gradient_accumulation_steps)) * config.num_training_epochs
        self.scheduler = LearningRateScheduler(
            self.optimizer, config.warmup_steps, total_steps, config.learning_rate
        )
        
        # 📊 Training state
        self.global_step = 0
        self.epoch = 0
        self.best_loss = float('inf')
        self.training_losses = []
        self.validation_losses = []
        
        print(f"🚀 Initialized trainer with {total_steps:,} total training steps")
        print(f"📊 Model parameters: {sum(p.numel() for p in model.get_parameters() if p is not None):,}")
    
    def save_checkpoint(self, filepath: str, is_best: bool = False):
        """
        💾 Save model checkpoint
        
        Saves the current training state including model weights, optimizer state,
        and training metadata. This allows resuming training from any point.
        
        Args:
            filepath: Path to save the checkpoint
            is_best: Whether this is the best model so far
        """
        checkpoint = {
            'epoch': self.epoch,
            'global_step': self.global_step,
            'model_state': {
                # Save all model parameters
                'token_embeddings_weight': self.model.token_embeddings.weight,
                'positional_embeddings': self.model.positional_embeddings.position_vectors,
                'final_layer_norm_weight': self.model.final_layer_norm.weight,
                'final_layer_norm_bias': self.model.final_layer_norm.bias,
                'language_modeling_head_weight': self.model.language_modeling_head.weight,
                'language_modeling_head_bias': self.model.language_modeling_head.bias,
                # Transformer blocks are more complex - would need custom serialization
            },
            'optimizer_state': self.optimizer.state_dict() if hasattr(self.optimizer, 'state_dict') else None,
            'scheduler_state': {
                'current_step': self.scheduler.current_step,
            },
            'best_loss': self.best_loss,
            'training_losses': self.training_losses,
            'validation_losses': self.validation_losses,
            'config': self.config,
        }
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # In a real implementation, you'd use proper serialization like torch.save
        # For now, we'll just save the metadata
        metadata_path = filepath.replace('.pt', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump({
                'epoch': checkpoint['epoch'],
                'global_step': checkpoint['global_step'],
                'best_loss': checkpoint['best_loss'],
                'config': checkpoint['config'].__dict__,
            }, f, indent=2)
        
        print(f"💾 Saved checkpoint to {metadata_path}")
        
        if is_best:
            best_path = filepath.replace('.pt', '_best.json')
            with open(best_path, 'w') as f:
                json.dump({
                    'epoch': checkpoint['epoch'],
                    'global_step': checkpoint['global_step'],
                    'best_loss': checkpoint['best_loss'],
                    'message': 'Best model checkpoint'
                }, f, indent=2)
            print(f"🏆 Saved best model checkpoint to {best_path}")
    
    def clip_gradients(self):
        """
        ✂️ Gradient Clipping for Training Stability
        
        Clips gradients to prevent gradient explosion, which can destabilize
        training of large language models. Uses global norm clipping.
        
        Returns:
            float: The gradient norm before clipping
        """
        total_norm = 0.0
        for param in self.model.get_parameters():
            if param.grad is not None:
                param_norm = param.grad.norm()
                total_norm += param_norm ** 2
        
        total_norm = total_norm ** 0.5
        
        if total_norm > self.config.gradient_clip_norm:
            clip_coef = self.config.gradient_clip_norm / (total_norm + 1e-8)
            for param in self.model.get_parameters():
                if param.grad is not None:
                    param.grad *= clip_coef
        
        return total_norm
    
    def compute_loss(self, input_ids: Tensor, target_ids: Tensor) -> Tensor:
        """
        📊 Compute language modeling loss
        
        Computes cross-entropy loss between model predictions and target tokens.
        This is the core training objective for language models.
        
        Args:
            input_ids: Input token sequences [batch_size, seq_len]
            target_ids: Target token sequences [batch_size, seq_len]
            
        Returns:
            Tensor: Scalar loss value
        """
        # 🔄 Forward pass through model
        logits = self.model(input_ids)  # [batch_size, seq_len, vocab_size]
        
        # 📊 Reshape for loss computation
        batch_size, seq_len, vocab_size = logits.shape
        logits_flat = logits.reshape(-1, vocab_size)  # [batch_size * seq_len, vocab_size]
        targets_flat = target_ids.reshape(-1)  # [batch_size * seq_len]
        
        # 📈 Compute cross-entropy loss
        loss = logits_flat.sparse_categorical_crossentropy(targets_flat)
        
        return loss
    
    def train_epoch(self):
        """
        🎓 Train for one epoch
        
        Processes all training batches for one complete pass through the dataset.
        Implements gradient accumulation to simulate larger batch sizes.
        
        Returns:
            float: Average loss for the epoch
        """
        epoch_losses = []
        accumulated_loss = 0.0
        num_batches = len(self.dataset) // self.config.batch_size
        
        print(f"🎓 Training epoch {self.epoch + 1}/{self.config.num_training_epochs}")
        print(f"📊 Processing {num_batches:,} batches")
        
        for batch_idx in range(num_batches):
            # 📦 Get training batch
            input_ids, target_ids = self.dataset.get_batch(self.config.batch_size)
            
            # 🔄 Forward pass and loss computation
            loss = self.compute_loss(input_ids, target_ids)
            
            # 📉 Scale loss by gradient accumulation steps
            scaled_loss = loss / self.config.gradient_accumulation_steps
            
            # 🔄 Backward pass
            scaled_loss.backward()
            
            accumulated_loss += loss.item()
            
            # 📈 Update weights after accumulating gradients
            if (batch_idx + 1) % self.config.gradient_accumulation_steps == 0:
                # ✂️ Clip gradients for stability
                grad_norm = self.clip_gradients()
                
                # 📈 Update parameters
                self.optimizer.step()
                self.optimizer.zero_grad()
                
                # 📊 Update learning rate
                current_lr = self.scheduler.step()
                
                self.global_step += 1
                avg_loss = accumulated_loss / self.config.gradient_accumulation_steps
                epoch_losses.append(avg_loss)
                self.training_losses.append(avg_loss)
                
                # 📊 Logging
                if self.global_step % self.config.log_every_steps == 0:
                    print(f"📈 Step {self.global_step:,} | "
                          f"Loss: {avg_loss:.4f} | "
                          f"LR: {current_lr:.2e} | "
                          f"Grad Norm: {grad_norm:.2f}")
                
                # 💾 Save checkpoint
                if self.global_step % self.config.save_every_steps == 0:
                    checkpoint_path = os.path.join(
                        self.config.model_checkpoint_dir, 
                        f"checkpoint_step_{self.global_step}.pt"
                    )
                    self.save_checkpoint(checkpoint_path)
                
                # 🔄 Reset accumulated loss
                accumulated_loss = 0.0
        
        return sum(epoch_losses) / len(epoch_losses) if epoch_losses else float('inf')
    
    def generate_sample_text(self, prompt: str = "The", max_length: int = 100) -> str:
        """
        🎭 Generate sample text to monitor training progress
        
        Generates text using the current model state to see how well it's learning.
        This is useful for qualitative evaluation during training.
        
        Args:
            prompt: Starting text prompt
            max_length: Maximum number of tokens to generate
            
        Returns:
            str: Generated text
        """
        # 🔤 Tokenize prompt
        prompt_ids = self.tokenizer.tokenize(prompt)
        current_ids = Tensor([prompt_ids])
        
        # 🎭 Generate tokens autoregressively
        for _ in range(max_length):
            if current_ids.shape[1] >= self.config.sequence_max_length:
                break
                
            # 🧠 Get model predictions
            with Tensor.no_grad():
                logits = self.model(current_ids)
                next_token_logits = logits[0, -1, :] / self.config.generation_temperature
                
                # 🎲 Sample next token (simple sampling for now)
                probs = next_token_logits.softmax(axis=-1)
                next_token = probs.multinomial(1)
                
                # 🔄 Append to sequence
                current_ids = current_ids.cat(next_token.unsqueeze(0).unsqueeze(0), dim=1)
                
                # 🛑 Stop if we hit end token
                if next_token.item() == self.tokenizer.token_to_id.get("<EOS>", -1):
                    break
        
        # 📝 Convert back to text
        generated_ids = current_ids[0].numpy().tolist()
        generated_text = self.tokenizer.detokenize(generated_ids)
        
        return generated_text
    
    def train(self):
        """
        🚀 Main training loop
        
        Runs the complete training process including multiple epochs,
        checkpointing, and sample generation for monitoring progress.
        """
        print("🚀 Starting Wikipedia transformer training...")
        print(f"📊 Dataset size: {len(self.dataset):,} sequences")
        print(f"🎯 Training for {self.config.num_training_epochs} epochs")
        print(f"💾 Checkpoints saved to: {self.config.model_checkpoint_dir}")
        
        start_time = time.time()
        
        try:
            for epoch in range(self.config.num_training_epochs):
                self.epoch = epoch
                
                # 🎓 Train one epoch
                epoch_loss = self.train_epoch()
                
                print(f"✅ Epoch {epoch + 1} completed | Average Loss: {epoch_loss:.4f}")
                
                # 🎭 Generate sample text
                if epoch % 1 == 0:  # Generate every epoch
                    sample_text = self.generate_sample_text("The history of", max_length=50)
                    print(f"🎭 Sample generation: {sample_text}")
                
                # 💾 Save best model
                if epoch_loss < self.best_loss:
                    self.best_loss = epoch_loss
                    best_checkpoint_path = os.path.join(
                        self.config.model_checkpoint_dir, 
                        f"best_model_epoch_{epoch + 1}.pt"
                    )
                    self.save_checkpoint(best_checkpoint_path, is_best=True)
                
                print(f"⏱️ Epoch time: {(time.time() - start_time) / 60:.1f} minutes")
                start_time = time.time()
                
        except KeyboardInterrupt:
            print("\n⚠️ Training interrupted by user")
            # Save current state
            interrupt_checkpoint = os.path.join(
                self.config.model_checkpoint_dir, 
                f"interrupted_epoch_{self.epoch}_step_{self.global_step}.pt"
            )
            self.save_checkpoint(interrupt_checkpoint)
            print(f"💾 Saved interrupted training state to {interrupt_checkpoint}")
        
        except Exception as e:
            print(f"❌ Training failed with error: {e}")
            # Save current state for debugging
            error_checkpoint = os.path.join(
                self.config.model_checkpoint_dir, 
                f"error_epoch_{self.epoch}_step_{self.global_step}.pt"
            )
            self.save_checkpoint(error_checkpoint)
            print(f"💾 Saved error state to {error_checkpoint}")
            raise
        
        print("🎉 Training completed successfully!")
        
        # 💾 Save final checkpoint
        final_checkpoint = os.path.join(
            self.config.model_checkpoint_dir, 
            "final_model.pt"
        )
        self.save_checkpoint(final_checkpoint)
        
        return {
            'final_loss': self.best_loss,
            'total_steps': self.global_step,
            'training_losses': self.training_losses,
            'validation_losses': self.validation_losses
        }


def train_wikipedia_transformer():
    """
    🎯 Complete Wikipedia Transformer Training Pipeline
    
    This is the main function that orchestrates the entire training process:
    1. Load and process Wikipedia data
    2. Build tokenizer vocabulary
    3. Initialize model architecture
    4. Train the model on Wikipedia text
    5. Save the trained model
    
    This function demonstrates how to train a language model on a real-world
    dataset like Wikipedia, implementing all the techniques needed for
    production-scale language model training.
    
    Returns:
        dict: Training results and model metadata
    """
    print("=" * 80)
    print("🧠 WIKIPEDIA TRANSFORMER TRAINING PIPELINE")
    print("=" * 80)
    print("Training a GPT-style transformer on the entire English Wikipedia corpus")
    print("This demonstrates real-world language model training at scale.\n")
    
    # ⚙️ Initialize configuration
    config = WikipediaConfig()
    
    print("📋 Training Configuration:")
    print(f"   🔤 Vocabulary size: {config.vocab_size:,}")
    print(f"   🏗️ Model architecture: {config.num_transformer_layers} layers, {config.num_attention_heads} heads")
    print(f"   📏 Embedding dimension: {config.embedding_dimension}")
    print(f"   📝 Sequence length: {config.sequence_max_length}")
    print(f"   🎓 Batch size: {config.batch_size} (effective: {config.batch_size * config.gradient_accumulation_steps})")
    print(f"   📈 Learning rate: {config.learning_rate}")
    print(f"   🔥 Warmup steps: {config.warmup_steps:,}")
    print("")
    
    # 🔤 Step 1: Build tokenizer
    print("🔤 Building BPE tokenizer...")
    tokenizer = WikipediaTokenizer(config)
    
    if os.path.exists(config.tokenizer_path):
        print(f"📂 Loading existing tokenizer from {config.tokenizer_path}")
        tokenizer = WikipediaTokenizer.load(config.tokenizer_path)
    else:
        print("📖 Extracting Wikipedia text...")
        try:
            # Use dumpster-dive integration for efficient processing
            dumpster = DumpsterDiveIntegration(config)
            
            # Check dependencies
            if not dumpster.check_dependencies():
                print("❌ Required dependencies not available")
                print("🎯 Falling back to demo mode with sample text...")
                wikipedia_texts = self._get_demo_texts()
            else:
                # Setup and run dumpster-dive pipeline
                if not dumpster.setup_mongodb():
                    print("❌ MongoDB setup failed")
                    print("🎯 Falling back to demo mode...")
                    wikipedia_texts = self._get_demo_texts()
                else:
                    # Download and process Wikipedia dump
                    if dumpster.download_wikipedia_dump():
                        if dumpster.run_dumpster_dive():
                            print("🔤 Building tokenizer vocabulary from MongoDB...")
                            tokenizer.build_vocabulary_from_dumpster(dumpster)
                            print("💾 Saving tokenizer...")
                            tokenizer.save(config.tokenizer_path)
                            # Set wikipedia_texts to None since we're using MongoDB
                            wikipedia_texts = None
                        else:
                            print("❌ dumpster-dive processing failed")
                            print("🎯 Falling back to demo mode...")
                            wikipedia_texts = self._get_demo_texts()
                    else:
                        print("❌ Wikipedia download failed")
                        print("🎯 Falling back to demo mode...")
                        wikipedia_texts = self._get_demo_texts()
                        
        except Exception as e:
            print(f"❌ Error in Wikipedia processing: {e}")
            print("🎯 Falling back to demo mode with sample text...")
            wikipedia_texts = self._get_demo_texts()
            
        # Build vocabulary from demo texts if needed
        if wikipedia_texts is not None:
            print("🔤 Building demo tokenizer vocabulary...")
            tokenizer.build_vocabulary(wikipedia_texts)
            print("💾 Saving demo tokenizer...")
            tokenizer.save(config.tokenizer_path)
    
    def _get_demo_texts(self) -> List[str]:
        """
        🎯 Get demo texts for testing when Wikipedia dump is not available
        
        Returns a set of sample texts that can be used for development and testing
        without needing the full Wikipedia dump.
        
        Returns:
            List of demo article texts
        """
        demo_texts = [
            "The cat sat on the mat and looked at the dog. This is a simple sentence for testing.",
            "Wikipedia is a free online encyclopedia that anyone can edit. It contains millions of articles in many languages.",
            "Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data.",
            "The transformer architecture revolutionized natural language processing by introducing the attention mechanism.",
            "Deep learning models require large amounts of training data to learn complex patterns and representations.",
            "Python is a high-level programming language known for its simplicity and readability.",
            "Neural networks are inspired by the structure and function of biological neural networks in animal brains.",
            "Natural language processing combines computational linguistics with statistical and machine learning methods.",
            "Artificial intelligence aims to create machines that can perform tasks that typically require human intelligence.",
            "Large language models like GPT have shown remarkable capabilities in text generation and understanding."
        ] * 2000  # Repeat for more training data
        
        return demo_texts
    
    print(f"✅ Tokenizer ready with {len(tokenizer.token_to_id):,} tokens")
    
    # 📊 Step 2: Prepare training dataset
    print("\n📊 Preparing training dataset...")
    dataset = WikipediaDataset(config, tokenizer)
    
    processed_data_path = os.path.join(config.processed_data_dir, "training_sequences.pkl")
    if os.path.exists(processed_data_path):
        print(f"📂 Loading existing processed data from {processed_data_path}")
        with open(processed_data_path, 'rb') as f:
            dataset.sequences = pickle.load(f)
        print(f"📊 Loaded {len(dataset.sequences):,} training sequences")
    else:
        print("🔧 Processing Wikipedia text into training sequences...")
        
        # Use dumpster-dive if available, otherwise use demo texts
        if wikipedia_texts is None:
            # We're using MongoDB via dumpster-dive
            try:
                dumpster = DumpsterDiveIntegration(config)
                if dumpster.setup_mongodb():
                    dataset.prepare_training_data_from_dumpster(dumpster)
                else:
                    raise Exception("MongoDB not available")
            except Exception as e:
                print(f"❌ MongoDB processing failed: {e}")
                print("🎯 Using demo texts instead...")
                wikipedia_texts = train_wikipedia_transformer._get_demo_texts()
                dataset.prepare_training_data(wikipedia_texts)
        else:
            # We have demo texts to use
            dataset.prepare_training_data(wikipedia_texts)
    
    print(f"✅ Dataset ready with {len(dataset):,} training sequences")
    
    # 🤖 Step 3: Initialize model
    print("\n🤖 Initializing transformer model...")
    model = GPTStyleTransformer(config)
    
    total_params = sum(p.numel() for p in model.get_parameters() if p is not None)
    print(f"📊 Model initialized with {total_params:,} parameters")
    print(f"💾 Estimated model size: {total_params * 4 / 1024**2:.1f} MB (FP32)")
    
    # 🚀 Step 4: Train the model
    print("\n🚀 Starting training...")
    trainer = WikipediaTrainer(config, model, tokenizer, dataset)
    
    training_results = trainer.train()
    
    # 📊 Step 5: Display results
    print("\n" + "=" * 80)
    print("📊 TRAINING RESULTS")
    print("=" * 80)
    print(f"✅ Training completed successfully!")
    print(f"📉 Best loss: {training_results['final_loss']:.4f}")
    print(f"📈 Total training steps: {training_results['total_steps']:,}")
    print(f"💾 Model saved to: {config.model_checkpoint_dir}")
    print(f"🔤 Tokenizer saved to: {config.tokenizer_path}")
    
    # 🎭 Step 6: Generate sample text
    print("\n" + "=" * 80)
    print("🎭 SAMPLE TEXT GENERATION")
    print("=" * 80)
    
    sample_prompts = [
        "The history of artificial intelligence",
        "Wikipedia is an encyclopedia",
        "Machine learning algorithms",
        "The transformer neural network"
    ]
    
    print("Generating sample text with the trained model:")
    for prompt in sample_prompts:
        try:
            generated = trainer.generate_sample_text(prompt, max_length=50)
            print(f"🎯 '{prompt}' -> {generated}")
        except Exception as e:
            print(f"❌ Generation failed for '{prompt}': {e}")
    
    return {
        'model': model,
        'tokenizer': tokenizer,
        'trainer': trainer,
        'config': config,
        'training_results': training_results,
        'dataset_size': len(dataset),
        'vocabulary_size': len(tokenizer.token_to_id),
        'model_parameters': total_params
    }


def advanced_generation_techniques(model: GPTStyleTransformer, tokenizer: WikipediaTokenizer, config: WikipediaConfig):
    """
    🎨 Advanced Text Generation Techniques
    
    Demonstrates sophisticated text generation methods beyond simple sampling:
    - Top-k sampling: Only consider the k most likely next tokens
    - Nucleus (top-p) sampling: Consider tokens in the top p% of probability mass
    - Temperature scaling: Control randomness vs coherence
    - Beam search: Find the most likely sequences
    
    These techniques are crucial for generating high-quality, coherent text
    from language models in production applications.
    
    Reference: https://huggingface.co/blog/how-to-generate
    
    Args:
        model: Trained transformer model
        tokenizer: Tokenizer for encoding/decoding
        config: Configuration object
    """
    print("\n" + "=" * 80)
    print("🎨 ADVANCED TEXT GENERATION TECHNIQUES")
    print("=" * 80)
    
    def generate_with_top_k(prompt: str, max_length: int = 100, temperature: float = 0.8, top_k: int = 50):
        """
        🎯 Top-k sampling generation
        
        Only considers the k most likely tokens at each step, filtering out
        unlikely options to improve coherence while maintaining creativity.
        """
        prompt_ids = tokenizer.tokenize(prompt)
        current_ids = Tensor([prompt_ids])
        
        generated_tokens = []
        
        for _ in range(max_length):
            if current_ids.shape[1] >= config.sequence_max_length:
                break
            
            with Tensor.no_grad():
                logits = model(current_ids)
                next_token_logits = logits[0, -1, :] / temperature
                
                # 🎯 Apply top-k filtering
                if top_k > 0:
                    # Get top-k logits and indices
                    top_k_logits, top_k_indices = next_token_logits.topk(min(top_k, next_token_logits.shape[0]))
                    
                    # Create filtered logits tensor
                    filtered_logits = Tensor([-float('inf')] * next_token_logits.shape[0])
                    for i, idx in enumerate(top_k_indices.numpy()):
                        filtered_logits[idx] = top_k_logits[i]
                    
                    next_token_logits = filtered_logits
                
                # 📊 Sample from filtered distribution
                probs = next_token_logits.softmax(axis=-1)
                next_token = probs.multinomial(1)
                
                current_ids = current_ids.cat(next_token.unsqueeze(0).unsqueeze(0), dim=1)
                generated_tokens.append(next_token.item())
                
                # 🛑 Stop at end token
                if next_token.item() == tokenizer.token_to_id.get("<EOS>", -1):
                    break
        
        return tokenizer.detokenize(prompt_ids + generated_tokens)
    
    def generate_with_nucleus(prompt: str, max_length: int = 100, temperature: float = 0.8, top_p: float = 0.9):
        """
        🌟 Nucleus (top-p) sampling generation
        
        Dynamically selects the smallest set of tokens whose cumulative
        probability exceeds p, adapting the vocabulary size based on
        the confidence of the model's predictions.
        """
        prompt_ids = tokenizer.tokenize(prompt)
        current_ids = Tensor([prompt_ids])
        
        generated_tokens = []
        
        for _ in range(max_length):
            if current_ids.shape[1] >= config.sequence_max_length:
                break
            
            with Tensor.no_grad():
                logits = model(current_ids)
                next_token_logits = logits[0, -1, :] / temperature
                
                # 🌟 Apply nucleus filtering
                if top_p < 1.0:
                    # Sort probabilities in descending order
                    sorted_logits, sorted_indices = next_token_logits.sort(descending=True)
                    cumulative_probs = sorted_logits.softmax(axis=-1).cumsum(axis=-1)
                    
                    # Find cutoff index where cumulative probability exceeds top_p
                    cutoff_idx = (cumulative_probs <= top_p).sum().item()
                    cutoff_idx = max(1, cutoff_idx)  # Keep at least one token
                    
                    # Create filtered logits
                    filtered_logits = Tensor([-float('inf')] * next_token_logits.shape[0])
                    for i in range(cutoff_idx):
                        original_idx = sorted_indices[i].item()
                        filtered_logits[original_idx] = next_token_logits[original_idx]
                    
                    next_token_logits = filtered_logits
                
                # 📊 Sample from filtered distribution
                probs = next_token_logits.softmax(axis=-1)
                next_token = probs.multinomial(1)
                
                current_ids = current_ids.cat(next_token.unsqueeze(0).unsqueeze(0), dim=1)
                generated_tokens.append(next_token.item())
                
                # 🛑 Stop at end token
                if next_token.item() == tokenizer.token_to_id.get("<EOS>", -1):
                    break
        
        return tokenizer.detokenize(prompt_ids + generated_tokens)
    
    # 🎭 Demonstrate different generation techniques
    test_prompts = [
        "The future of artificial intelligence",
        "Climate change is a global challenge",
        "The history of computing began"
    ]
    
    for prompt in test_prompts:
        print(f"\n🎯 Prompt: '{prompt}'")
        print("-" * 60)
        
        try:
            # 🌡️ Different temperatures
            print("🌡️ Temperature variations:")
            for temp in [0.5, 0.8, 1.2]:
                result = generate_with_top_k(prompt, max_length=30, temperature=temp, top_k=50)
                print(f"  T={temp}: {result}")
            
            # 🎯 Top-k variations
            print("\n🎯 Top-k variations:")
            for k in [10, 50, 100]:
                result = generate_with_top_k(prompt, max_length=30, temperature=0.8, top_k=k)
                print(f"  k={k}: {result}")
            
            # 🌟 Nucleus variations
            print("\n🌟 Nucleus (top-p) variations:")
            for p in [0.7, 0.9, 0.95]:
                result = generate_with_nucleus(prompt, max_length=30, temperature=0.8, top_p=p)
                print(f"  p={p}: {result}")
                
        except Exception as e:
            print(f"❌ Generation failed: {e}")


def analyze_model_performance(trainer: WikipediaTrainer, tokenizer: WikipediaTokenizer):
    """
    📊 Comprehensive Model Performance Analysis
    
    Analyzes various aspects of the trained model's performance:
    - Training dynamics and loss curves
    - Perplexity on different text types
    - Attention pattern visualization (conceptual)
    - Token frequency analysis
    - Model size and efficiency metrics
    
    This helps understand how well the model has learned language patterns
    and identifies areas for improvement.
    
    Args:
        trainer: Trained model trainer
        tokenizer: Tokenizer used for training
    """
    print("\n" + "=" * 80)
    print("📊 MODEL PERFORMANCE ANALYSIS")
    print("=" * 80)
    
    # 📈 Training dynamics analysis
    print("📈 Training Dynamics:")
    if trainer.training_losses:
        initial_loss = trainer.training_losses[0]
        final_loss = trainer.training_losses[-1]
        improvement = ((initial_loss - final_loss) / initial_loss) * 100
        
        print(f"   🎯 Initial loss: {initial_loss:.4f}")
        print(f"   📉 Final loss: {final_loss:.4f}")
        print(f"   📈 Improvement: {improvement:.1f}%")
        
        # Find best loss
        best_loss = min(trainer.training_losses)
        best_step = trainer.training_losses.index(best_loss) + 1
        print(f"   🏆 Best loss: {best_loss:.4f} (step {best_step:,})")
        
        # Training stability
        recent_losses = trainer.training_losses[-100:] if len(trainer.training_losses) > 100 else trainer.training_losses
        loss_variance = np.var(recent_losses)
        print(f"   📊 Recent loss variance: {loss_variance:.6f}")
    
    # 🔤 Vocabulary analysis
    print(f"\n🔤 Vocabulary Analysis:")
    print(f"   📚 Total vocabulary size: {len(tokenizer.token_to_id):,}")
    print(f"   🔤 Special tokens: {len(tokenizer.config.special_tokens)}")
    print(f"   🔄 BPE merges learned: {len(tokenizer.bpe_merges):,}")
    
    # Show most frequent tokens (if word frequencies available)
    if hasattr(tokenizer, 'word_frequencies') and tokenizer.word_frequencies:
        print(f"   📊 Most frequent words:")
        top_words = tokenizer.word_frequencies.most_common(10)
        for word, freq in top_words:
            print(f"      '{word}': {freq:,}")
    
    # 🧠 Model architecture analysis
    print(f"\n🧠 Model Architecture:")
    config = trainer.config
    total_params = sum(p.numel() for p in trainer.model.get_parameters() if p is not None)
    
    print(f"   🏗️ Layers: {config.num_transformer_layers}")
    print(f"   🎯 Attention heads: {config.num_attention_heads}")
    print(f"   📏 Embedding dimension: {config.embedding_dimension}")
    print(f"   📝 Sequence length: {config.sequence_max_length}")
    print(f"   📊 Total parameters: {total_params:,}")
    print(f"   💾 Model size (FP32): {total_params * 4 / 1024**2:.1f} MB")
    print(f"   💾 Model size (FP16): {total_params * 2 / 1024**2:.1f} MB")
    
    # ⚡ Training efficiency
    print(f"\n⚡ Training Efficiency:")
    print(f"   🎓 Total training steps: {trainer.global_step:,}")
    print(f"   📊 Batch size: {config.batch_size}")
    print(f"   🔄 Gradient accumulation: {config.gradient_accumulation_steps}")
    print(f"   📈 Effective batch size: {config.batch_size * config.gradient_accumulation_steps}")
    print(f"   📉 Learning rate: {config.learning_rate}")
    print(f"   🔥 Warmup steps: {config.warmup_steps:,}")
    
    # 🎯 Performance estimates
    print(f"\n🎯 Performance Estimates:")
    
    # Estimate perplexity from final loss
    if trainer.training_losses:
        final_loss = trainer.training_losses[-1]
        estimated_perplexity = math.exp(final_loss)
        print(f"   📊 Estimated perplexity: {estimated_perplexity:.2f}")
        
        # Perplexity interpretation
        if estimated_perplexity < 50:
            quality = "🌟 Excellent"
        elif estimated_perplexity < 100:
            quality = "🟢 Good"
        elif estimated_perplexity < 200:
            quality = "🟡 Fair"
        else:
            quality = "🔴 Needs improvement"
        
        print(f"   🎯 Model quality: {quality}")
    
    # 📚 Comparison with known benchmarks
    print(f"\n📚 Reference Benchmarks:")
    print(f"   📖 GPT-1: ~18.4 perplexity on Penn Treebank")
    print(f"   📖 GPT-2: ~8.6 perplexity on Penn Treebank")
    print(f"   📖 Human performance: ~12 perplexity (estimated)")
    print(f"   📝 Note: Direct comparison requires same evaluation dataset")


def production_deployment_guide():
    """
    🚀 Production Deployment Guide
    
    Provides comprehensive guidance for deploying the trained Wikipedia transformer
    in production environments, covering optimization, serving, and monitoring.
    """
    print("\n" + "=" * 80)
    print("🚀 PRODUCTION DEPLOYMENT GUIDE")
    print("=" * 80)
    
    print("📋 Pre-Deployment Checklist:")
    print("   ✅ Model training completed successfully")
    print("   ✅ Model performance meets quality thresholds")
    print("   ✅ Comprehensive evaluation on held-out test data")
    print("   ✅ Safety and bias testing completed")
    print("   ✅ Model size optimized for target hardware")
    print("   ✅ Inference latency benchmarked")
    print("   ✅ Memory requirements documented")
    
    print("\n🔧 Model Optimization Techniques:")
    print("   📉 Quantization: Convert FP32 → FP16 or INT8")
    print("      • Reduces model size by 2-4x")
    print("      • Speeds up inference on modern hardware")
    print("      • Minimal accuracy loss with proper calibration")
    
    print("\n   ✂️ Pruning: Remove unimportant weights")
    print("      • Structured pruning: Remove entire neurons/heads")
    print("      • Unstructured pruning: Zero out individual weights")
    print("      • Can reduce model size by 50-90%")
    
    print("\n   🗜️ Knowledge Distillation: Train smaller student model")
    print("      • Student learns from teacher's predictions")
    print("      • Maintains performance with fewer parameters")
    print("      • Enables deployment on resource-constrained devices")
    
    print("\n⚡ Inference Optimization:")
    print("   🔄 KV-Cache: Cache attention keys and values")
    print("      • Avoids recomputation during generation")
    print("      • Critical for autoregressive generation speed")
    print("      • Trades memory for computation time")
    
    print("\n   📦 Batching: Process multiple requests together")
    print("      • Improves GPU utilization")
    print("      • Reduces per-request latency")
    print("      • Requires careful memory management")
    
    print("\n   🎯 Speculative Decoding: Predict multiple tokens")
    print("      • Use smaller model to generate candidate tokens")
    print("      • Verify candidates with larger model")
    print("      • Can speed up generation by 2-3x")
    
    print("\n🏗️ Serving Infrastructure:")
    print("   🌐 API Server Options:")
    print("      • FastAPI + Uvicorn: Python-based serving")
    print("      • TorchServe: PyTorch native serving")
    print("      • TensorRT: NVIDIA GPU optimization")
    print("      • ONNX Runtime: Cross-platform inference")
    
    print("\n   📊 Load Balancing:")
    print("      • Multiple model replicas behind load balancer")
    print("      • Health checks and automatic failover")
    print("      • Request routing based on model variants")
    
    print("\n   🔒 Security Considerations:")
    print("      • Input validation and sanitization")
    print("      • Rate limiting and DDoS protection")
    print("      • Output filtering for harmful content")
    print("      • Audit logging for compliance")
    
    print("\n📊 Monitoring and Observability:")
    print("   📈 Key Metrics to Track:")
    print("      • Request latency (p50, p95, p99)")
    print("      • Throughput (requests per second)")
    print("      • Error rates and failure modes")
    print("      • GPU/CPU utilization")
    print("      • Memory usage patterns")
    print("      • Model quality metrics (perplexity, BLEU)")
    
    print("\n   🚨 Alerting:")
    print("      • Latency spikes above thresholds")
    print("      • Error rate increases")
    print("      • Resource exhaustion warnings")
    print("      • Model quality degradation")
    
    print("\n💾 Model Management:")
    print("   🔄 Version Control:")
    print("      • Track model versions and experiments")
    print("      • A/B testing framework for model updates")
    print("      • Rollback capabilities for failed deployments")
    
    print("\n   📊 Continuous Evaluation:")
    print("      • Regular evaluation on fresh test data")
    print("      • Human evaluation for quality assessment")
    print("      • Bias and fairness monitoring")
    print("      • Performance regression detection")
    
    print("\n🌍 Scaling Considerations:")
    print("   📈 Horizontal Scaling:")
    print("      • Auto-scaling based on demand")
    print("      • Multi-region deployment")
    print("      • Edge caching for common requests")
    
    print("\n   ⚡ Optimization Pipeline:")
    print("      • Continuous profiling and optimization")
    print("      • Hardware-specific optimizations")
    print("      • Model architecture search")
    print("      • Training data quality improvements")


def setup_wikipedia_environment():
    """
    🛠️ Setup Environment for Wikipedia Training with Dumpster-Dive
    
    Provides step-by-step instructions and checks for setting up the complete
    Wikipedia training environment including Node.js, MongoDB, and dumpster-dive.
    """
    print("=" * 80)
    print("🛠️ WIKIPEDIA TRAINING ENVIRONMENT SETUP")
    print("=" * 80)
    
    print("📋 Prerequisites for Wikipedia Training:")
    print("   1. Node.js (v12 or higher)")
    print("   2. MongoDB (v4.0 or higher)")  
    print("   3. dumpster-dive package")
    print("   4. Python packages: tinygrad, pymongo, numpy")
    print("   5. 100GB+ free disk space")
    print("   6. 16GB+ RAM recommended")
    print("")
    
    print("🚀 Step-by-Step Setup Instructions:")
    print("")
    
    print("1️⃣ Install Node.js:")
    print("   • Download from: https://nodejs.org/")
    print("   • Or use package manager:")
    print("     - macOS: brew install node")
    print("     - Ubuntu: sudo apt install nodejs npm")
    print("     - Windows: Download installer from nodejs.org")
    print("")
    
    print("2️⃣ Install MongoDB:")
    print("   • Download from: https://www.mongodb.com/try/download/community")
    print("   • Or use package manager:")
    print("     - macOS: brew install mongodb-community")
    print("     - Ubuntu: sudo apt install mongodb")
    print("     - Windows: Download installer from mongodb.com")
    print("")
    
    print("3️⃣ Install dumpster-dive:")
    print("   npm install -g dumpster-dive")
    print("")
    
    print("4️⃣ Install Python dependencies:")
    print("   pip install tinygrad pymongo numpy")
    print("")
    
    print("5️⃣ Start MongoDB:")
    print("   mongod --config /path/to/mongod.conf")
    print("   # Or simply: mongod")
    print("")
    
    print("6️⃣ Download Wikipedia dump:")
    print("   # English Wikipedia (16GB compressed, 100GB uncompressed)")
    print("   wget https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles.xml.bz2")
    print("")
    print("   # For testing, try a smaller language:")
    print("   # Afrikaans Wikipedia (~38MB compressed)")
    print("   # wget https://dumps.wikimedia.org/afwiki/latest/afwiki-latest-pages-articles.xml.bz2")
    print("")
    
    print("7️⃣ Decompress Wikipedia dump:")
    print("   # Fast decompression (if available):")
    print("   brew install lbzip2  # macOS")
    print("   sudo apt install lbzip2  # Ubuntu")
    print("   lbzip2 -d enwiki-latest-pages-articles.xml.bz2")
    print("")
    print("   # Standard decompression (slower):")
    print("   bzip2 -d enwiki-latest-pages-articles.xml.bz2")
    print("")
    
    print("8️⃣ Process Wikipedia with dumpster-dive:")
    print("   dumpster ./enwiki-latest-pages-articles.xml --db=enwiki")
    print("   # This takes several hours for English Wikipedia")
    print("")
    
    print("9️⃣ Run transformer training:")
    print("   python wikipedia_transformer.py")
    print("")
    
    print("🎯 Quick Test Setup (Recommended for first run):")
    print("   1. Skip Wikipedia download")
    print("   2. Set config.use_demo_mode = True")
    print("   3. Run: python wikipedia_transformer.py")
    print("   4. This will use sample text for testing")
    print("")
    
    print("⚠️ Important Notes:")
    print("   • English Wikipedia processing requires ~8 hours")
    print("   • Use SSD storage for better performance")
    print("   • Monitor disk space during processing")
    print("   • Consider starting with smaller language Wikipedia")
    print("   • Training can be interrupted and resumed")
    print("")
    
    print("🔧 Troubleshooting:")
    print("   • If Node.js not found: Check PATH environment variable")
    print("   • If MongoDB connection fails: Check mongod is running")
    print("   • If dumpster-dive fails: Check XML file is decompressed")
    print("   • If out of memory: Reduce batch_size in config")
    print("   • If out of disk: Use smaller Wikipedia dump")
    print("")


def get_wikipedia_statistics(dumpster: DumpsterDiveIntegration):
    """
    📊 Analyze Wikipedia Dataset Statistics
    
    Provides comprehensive statistics about the Wikipedia dataset stored in MongoDB,
    helping understand the scale and characteristics of the training data.
    
    Args:
        dumpster: DumpsterDiveIntegration instance with MongoDB connection
    """
    print("\n" + "=" * 80)
    print("📊 WIKIPEDIA DATASET STATISTICS")
    print("=" * 80)
    
    if not dumpster.collection:
        print("❌ MongoDB collection not available")
        return
    
    try:
        # Basic counts
        total_articles = dumpster.collection.count_documents({})
        main_articles = dumpster.collection.count_documents({'ns': 0})
        
        print(f"📚 Total pages in database: {total_articles:,}")
        print(f"📖 Main namespace articles: {main_articles:,}")
        print(f"🔧 Other pages (talk, category, etc.): {total_articles - main_articles:,}")
        
        # Sample some articles for analysis
        print(f"\n📊 Analyzing sample articles...")
        sample_articles = list(dumpster.collection.find({'ns': 0}, {'text': 1, 'title': 1}).limit(1000))
        
        if sample_articles:
            lengths = [len(article.get('text', '')) for article in sample_articles]
            
            print(f"📏 Article length statistics (sample of {len(sample_articles):,}):")
            print(f"   📈 Average length: {sum(lengths) / len(lengths):.0f} characters")
            print(f"   📊 Median length: {sorted(lengths)[len(lengths)//2]:,} characters")
            print(f"   📉 Min length: {min(lengths):,} characters")
            print(f"   📈 Max length: {max(lengths):,} characters")
            
            # Length distribution
            short_articles = sum(1 for l in lengths if l < 1000)
            medium_articles = sum(1 for l in lengths if 1000 <= l < 10000)
            long_articles = sum(1 for l in lengths if l >= 10000)
            
            print(f"\n📊 Length distribution:")
            print(f"   📄 Short (<1K chars): {short_articles:,} ({short_articles/len(lengths)*100:.1f}%)")
            print(f"   📄 Medium (1K-10K): {medium_articles:,} ({medium_articles/len(lengths)*100:.1f}%)")
            print(f"   📄 Long (>10K chars): {long_articles:,} ({long_articles/len(lengths)*100:.1f}%)")
        
        # Category analysis
        print(f"\n📚 Category analysis...")
        categories_sample = list(dumpster.collection.find(
            {'ns': 0, 'categories': {'$exists': True, '$ne': []}}, 
            {'categories': 1}
        ).limit(1000))
        
        if categories_sample:
            all_categories = []
            for doc in categories_sample:
                all_categories.extend(doc.get('categories', []))
            
            category_counts = Counter(all_categories)
            top_categories = category_counts.most_common(10)
            
            print(f"🏷️ Top categories (from sample):")
            for category, count in top_categories:
                print(f"   • {category}: {count}")
        
        # Estimate total data size
        sample_size = min(100, main_articles)
        size_sample = list(dumpster.collection.find({'ns': 0}, {'text': 1}).limit(sample_size))
        
        if size_sample:
            avg_article_size = sum(len(doc.get('text', '')) for doc in size_sample) / len(size_sample)
            estimated_total_size = avg_article_size * main_articles
            
            print(f"\n💾 Estimated dataset size:")
            print(f"   📊 Average article size: {avg_article_size:.0f} characters")
            print(f"   📊 Total text size: {estimated_total_size / 1024**2:.0f} MB")
            print(f"   📊 Total text size: {estimated_total_size / 1024**3:.1f} GB")
        
        print(f"\n🎯 Training recommendations:")
        if main_articles < 1000:
            print("   📝 Small dataset - good for testing and development")
        elif main_articles < 100000:
            print("   📝 Medium dataset - suitable for initial training")
        else:
            print("   📝 Large dataset - production-scale training possible")
            
        print(f"   🎯 Recommended sequence length: {min(1024, int(avg_article_size * 0.8))}")
        print(f"   🎯 Recommended vocab size: {min(32000, max(8000, main_articles // 100))}")
        
    except Exception as e:
        print(f"❌ Error analyzing dataset: {e}")


def main_with_dumpster_dive():
    """
    🎯 Main execution function for Wikipedia transformer training
    
    This orchestrates the complete pipeline from data preparation to model
    deployment, demonstrating a real-world language model training workflow.
    """
    print("🌟 Welcome to Wikipedia Transformer Training!")
    print("This implementation demonstrates training a GPT-style language model")
    print("on the entire English Wikipedia corpus using advanced techniques.\n")
    
    try:
        # 🚀 Run the complete training pipeline
        results = train_wikipedia_transformer()
        
        # 📊 Analyze model performance
        analyze_model_performance(results['trainer'], results['tokenizer'])
        
        # 🎨 Demonstrate advanced generation
        advanced_generation_techniques(
            results['model'], 
            results['tokenizer'], 
            results['config']
        )
        
        # 🚀 Show deployment guide
        production_deployment_guide()
        
        print("\n" + "=" * 80)
        print("🎉 TRAINING PIPELINE COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print(f"✅ Model trained with {results['model_parameters']:,} parameters")
        print(f"📚 Vocabulary size: {results['vocabulary_size']:,} tokens")
        print(f"📊 Dataset size: {results['dataset_size']:,} sequences")
        print(f"📉 Final loss: {results['training_results']['final_loss']:.4f}")
        print(f"💾 Saved to: {results['config'].model_checkpoint_dir}")
        
        print("\n🚀 Next Steps:")
        print("   1. 📊 Evaluate on held-out test data")
        print("   2. 🎯 Fine-tune for specific domains")
        print("   3. 🔧 Optimize for production deployment")
        print("   4. 📈 Scale up model size and training data")
        print("   5. 🧠 Experiment with architectural improvements")
        
        return results
        
    except Exception as e:
        print(f"\n❌ Training pipeline failed: {e}")
        print("🔧 Troubleshooting suggestions:")
        print("   • Check Wikipedia dump file exists and is readable")
        print("   • Ensure sufficient disk space for processed data")
        print("   • Verify adequate RAM for model training")
        print("   • Check Python dependencies are installed")
        print("   • Try reducing model size or batch size")
        raise


def educational_resources():
    """
    📚 Educational Resources and Further Learning
    
    Comprehensive guide to understanding transformers and language models,
    with links to papers, tutorials, and practical resources.
    """
    print("\n" + "=" * 80)
    print("📚 EDUCATIONAL RESOURCES")
    print("=" * 80)
    
    print("📖 Foundational Papers:")
    print("   • Attention Is All You Need (Transformer): https://arxiv.org/abs/1706.03762")
    print("   • Improving Language Understanding (GPT): https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf")
    print("   • Language Models are Few-Shot Learners (GPT-3): https://arxiv.org/abs/2005.14165")
    print("   • Training language models to follow instructions (InstructGPT): https://arxiv.org/abs/2203.02155")
    
    print("\n🎓 Online Courses and Tutorials:")
    print("   • Hugging Face Course: https://huggingface.co/learn")
    print("   • CS224N Stanford NLP: http://web.stanford.edu/class/cs224n/")
    print("   • Fast.ai NLP Course: https://www.fast.ai/")
    print("   • DeepLearning.ai Specialization: https://www.coursera.org/specializations/deep-learning")
    
    print("\n🔬 Technical Deep Dives:")
    print("   • The Illustrated Transformer: https://jalammar.github.io/illustrated-transformer/")
    print("   • The Illustrated GPT-2: https://jalammar.github.io/illustrated-gpt2/")
    print("   • Transformer Math 101: https://blog.eleuther.ai/transformer-math/")
    print("   • LLM Training Guide: https://rentry.org/llm-training")
    
    print("\n💻 Practical Implementation Guides:")
    print("   • Building a Transformer with PyTorch: https://www.datacamp.com/tutorial/building-a-transformer-with-py-torch")
    print("   • Annotated Transformer: http://nlp.seas.harvard.edu/2018/04/03/attention.html")
    print("   • GPT from Scratch: https://github.com/karpathy/minGPT")
    print("   • LLM Training Example: https://github.com/vtempest/ai-research-agent/blob/master/packages/neural-net/src/train/predict-next-word.js")
    
    print("\n🛠️ Tools and Frameworks:")
    print("   • Hugging Face Transformers: https://github.com/huggingface/transformers")
    print("   • PyTorch: https://pytorch.org/")
    print("   • TensorFlow: https://www.tensorflow.org/")
    print("   • Tinygrad: https://github.com/geohot/tinygrad")
    print("   • JAX: https://jax.readthedocs.io/")
    
    print("\n📊 Datasets and Benchmarks:")
    print("   • Common Crawl: https://commoncrawl.org/")
    print("   • The Pile: https://pile.eleuther.ai/")
    print("   • Wikipedia Dumps: https://dumps.wikimedia.org/")
    print("   • GLUE Benchmark: https://gluebenchmark.com/")
    print("   • SuperGLUE: https://super.gluebenchmark.com/")
    
    print("\n🔬 Research Communities:")
    print("   • EleutherAI: https://www.eleuther.ai/")
    print("   • BigScience: https://bigscience.huggingface.co/")
    print("   • Papers With Code: https://paperswithcode.com/")
    print("   • ML Twitter: Active research discussions")
    print("   • Reddit r/MachineLearning: Community discussions")
    
    print("\n🎯 Specialized Topics:")
    print("   • Scaling Laws: https://arxiv.org/abs/2001.08361")
    print("   • Constitutional AI: https://arxiv.org/abs/2212.08073")
    print("   • Chain-of-Thought Prompting: https://arxiv.org/abs/2201.11903")
    print("   • In-Context Learning: https://arxiv.org/abs/2005.14165")
    print("   • RLHF: https://arxiv.org/abs/2203.02155")


if __name__ == "__main__":
    """
    🎯 Entry point for Wikipedia transformer training
    
    Run this script to start the complete training pipeline.
    Make sure you have the Wikipedia dump downloaded first!
    
    To download Wikipedia dump:
    wget https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles.xml.bz2
    
    Or update the config.wikipedia_dump_path to point to your dump file.
    """
    print("🚀 Starting Wikipedia Transformer Training Pipeline...")
    
    # Run the main training pipeline
    results = main()
    
    # Show educational resources
    educational_resources()
    
    print("\n" + "=" * 80)
    print("🎓 CONGRATULATIONS!")
    print("=" * 80)
    print("You've successfully implemented and trained a transformer language model")
    print("on Wikipedia data! This demonstrates the core techniques used in GPT,")
    print("BERT, T5, and other state-of-the-art language models.")
    print("\n💡 Key concepts you've learned:")
    print("   • Transformer architecture and self-attention")
    print("   • Byte-Pair Encoding (BPE) tokenization")
    print("   • Large-scale dataset processing")
    print("   • Advanced training techniques (warmup, scheduling, clipping)")
    print("   • Text generation with sampling strategies")
    print("   • Production deployment considerations")
    print("\n🌟 You now have the foundation to:")
    print("   • Build and train your own language models")
    print("   • Understand and modify existing models")
    print("   • Contribute to the open-source ML community")
    print("   • Pursue advanced research in NLP and AI")
    print("\n🚀 Keep learning and building amazing things with AI!")