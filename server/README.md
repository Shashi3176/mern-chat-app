# ChatApp Server

## Content Moderation

The application includes an automated content moderation system powered by Hugging Face's Inference API using the [Unitary/toxic-bert](https://huggingface.co/unitary/toxic-bert) model. This system automatically filters toxic content before messages are sent.

### How It Works

1. **Message Check**: When a user sends a message longer than 3 characters, it's sent to the Hugging Face API for toxicity analysis
2. **Model Analysis**: The ToxicBERT model analyzes the message and returns confidence scores for 6 categories
3. **Threshold Comparison**: Each category score is compared against your configured threshold (default: 0.5)
4. **Action**: If any configured category exceeds the threshold, the message is blocked and logged

### Content Blocked

- **toxic**: Generally toxic content
- **severe_toxic**: Severely toxic content
- **obscene**: Obscene language
- **threat**: Threatening language
- **insult**: Insulting language
- **identity_hate**: Hate speech based on identity

### Privacy Considerations

- Messages are sent to Hugging Face's API for processing (transient, not stored)
- Blocked messages are logged locally for moderation review
- Message content is hashed before caching (SHA-256)
- Consider your data residency requirements before enabling

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env to add your HUGGINGFACE_API_TOKEN
npm start
```

## Documentation

- [Toxicity Setup Guide](./TOXICITY_SETUP.md) - Step-by-step configuration
- [API Documentation](./API_DOCUMENTATION.md) - REST API endpoints
- [Tuning Guide](./TUNING_GUIDE.md) - Adjusting sensitivity
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Production deployment
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions