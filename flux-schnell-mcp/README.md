# Flux Schnell MCP Server

An MCP server implementation for the Flux Schnell image generation model from Black Forest Labs.

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Copy the example environment file and add your Replicate API token:
```bash
cp .env.example .env
# Edit .env and add your REPLICATE_API_TOKEN
```
4. Build the server:
```bash
npm run build
```

## Configuration

Add the server to your MCP settings file (usually at `~/.vscode-remote/data/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "flux-schnell": {
      "command": "node",
      "args": ["/path/to/flux-schnell-mcp/dist/server.js"],
      "disabled": false,
      "alwaysAllow": [],
      "env": {
        "REPLICATE_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Available Tools

### generate_image

Generates images using the Flux Schnell model.

Parameters:
- `prompt` (required): Text prompt describing the desired image
- `go_fast` (optional): Enable fast mode (default: true)
- `megapixels` (optional): Image resolution in megapixels ('1', '2', '4') (default: '1')
- `num_outputs` (optional): Number of images to generate (1-4) (default: 1)
- `aspect_ratio` (optional): Image aspect ratio ('1:1', '4:3', '16:9') (default: '1:1')
- `output_format` (optional): Output image format ('webp', 'png', 'jpeg') (default: 'webp')
- `output_quality` (optional): Output image quality (1-100) (default: 80)
- `num_inference_steps` (optional): Number of inference steps (4-20) (default: 4)

Example usage:
```typescript
const result = await useMcpTool('flux-schnell', 'generate_image', {
  prompt: "black forest gateau cake spelling out the words 'FLUX SCHNELL', tasty, food photography, dynamic shot",
  go_fast: true,
  megapixels: "1",
  aspect_ratio: "1:1",
  output_format: "webp"
});
```

## Development

To run the server in development mode with automatic recompilation:

```bash
npm run dev