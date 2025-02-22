#!/usr/bin/env node
import { config } from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

config();
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) {
  throw new Error('REPLICATE_API_TOKEN environment variable is required');
}

interface GenerateImageArgs {
  prompt: string;
  go_fast?: boolean;
  megapixels?: '1' | '0.25';
  num_outputs?: number;
  aspect_ratio?: '1:1' | '4:3' | '16:9';
  output_format?: 'webp' | 'png' | 'jpeg';
  output_quality?: number;
  num_inference_steps?: number;
}

function isGenerateImageArgs(obj: unknown): obj is GenerateImageArgs {
  if (!obj || typeof obj !== 'object') return false;
  const args = obj as Record<string, unknown>;
  
  if (typeof args.prompt !== 'string') return false;
  if (args.go_fast !== undefined && typeof args.go_fast !== 'boolean') return false;
  if (args.megapixels !== undefined && !['1', '0.25'].includes(args.megapixels as string)) return false;
  if (args.num_outputs !== undefined && typeof args.num_outputs !== 'number') return false;
  if (args.aspect_ratio !== undefined && !['1:1', '4:3', '16:9'].includes(args.aspect_ratio as string)) return false;
  if (args.output_format !== undefined && !['webp', 'png', 'jpeg'].includes(args.output_format as string)) return false;
  if (args.output_quality !== undefined && typeof args.output_quality !== 'number') return false;
  if (args.num_inference_steps !== undefined && typeof args.num_inference_steps !== 'number') return false;
  
  return true;
}

class FluxSchnellServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'flux-schnell-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: 'https://api.replicate.com/v1',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      }
    });

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_image',
          description: 'Generate an image using the Flux Schnell model',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'Text prompt describing the desired image'
              },
              go_fast: {
                type: 'boolean',
                description: 'Enable fast mode'
              },
              megapixels: {
                type: 'string',
                enum: ['1', '0.25'],
                description: 'Image resolution in megapixels'
              },
              num_outputs: {
                type: 'number',
                minimum: 1,
                maximum: 4,
                description: 'Number of images to generate'
              },
              aspect_ratio: {
                type: 'string',
                enum: ['1:1', '4:3', '16:9'],
                description: 'Image aspect ratio'
              },
              output_format: {
                type: 'string',
                enum: ['webp', 'png', 'jpeg'],
                description: 'Output image format'
              },
              output_quality: {
                type: 'number',
                minimum: 1,
                maximum: 100,
                description: 'Output image quality'
              },
              num_inference_steps: {
                type: 'number',
                minimum: 4,
                maximum: 4,
                description: 'Number of inference steps'
              }
            },
            required: ['prompt'],
            additionalProperties: false
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'generate_image') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!isGenerateImageArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid parameters for generate_image'
        );
      }

      const args = request.params.arguments;
      
      try {
        const response = await this.axiosInstance.post(
          '/models/black-forest-labs/flux-schnell/predictions',
          {
            input: {
              prompt: args.prompt,
              go_fast: args.go_fast ?? true,
              megapixels: args.megapixels ?? '1',
              num_outputs: args.num_outputs ?? 1,
              aspect_ratio: args.aspect_ratio ?? '1:1',
              output_format: args.output_format ?? 'webp',
              output_quality: args.output_quality ?? 80,
              num_inference_steps: args.num_inference_steps ?? 4
            }
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }
          ]
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new McpError(
            ErrorCode.InternalError,
            `Replicate API error: ${error.response?.data?.detail || error.message}`
          );
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Flux Schnell MCP server running on stdio');
  }
}

const server = new FluxSchnellServer();
server.run().catch(console.error);