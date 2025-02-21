import { URL } from 'node:url';
import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeOperationError } from 'n8n-workflow';
import { YoutubeTranscript } from 'youtube-transcript';

export class YoutubeTranscriptNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Youtube Transcript',
    name: 'youtubeTranscriptNode',
    // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
    icon: 'file:youTube.png',
    group: ['transform'],
    version: 1,
    description: 'Get Transcript of a youtube video',
    defaults: {
      name: 'Youtube Transcript',
    },
    // @ts-ignore
    inputs: ['main'],
    // @ts-ignore
    outputs: ['main'],
    properties: [
      {
        displayName: 'Youtube Video ID or Url',
        name: 'youtubeId',
        type: 'string',
        default: '',
        placeholder: 'Youtube Video ID or Url',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        let youtubeId = this.getNodeParameter('youtubeId', itemIndex, '') as string;

				if (/^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/.test(youtubeId)) {
					try {
						const url = new URL(youtubeId);

						if (url.hostname === 'youtu.be') {
							youtubeId = url.pathname.slice(1); // Extract the video ID from the path
						} else {
							const v = url.searchParams.get('v');
							if (!v) {
								throw new ApplicationError(
									`The provided URL doesn't contain a valid YouTube video identifier. URL: ${youtubeId}`,
								);
							}
							youtubeId = v;
						}
					} catch (error) {
						throw new ApplicationError(
							'Invalid YouTube URL format. Please provide a valid URL or video ID.',
						);
					}
				}
        const transcript = await YoutubeTranscript.fetchTranscript(youtubeId);
        const text = transcript.map(line => line.text).join(' ');
        returnData.push({
          json: {
            youtubeId,
            text,
          },
          pairedItem: { item: itemIndex },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : String(error),
            },
            pairedItem: { item: itemIndex },
          });
        } else {
          throw new NodeOperationError(this.getNode(), error);
        }
      }
    }

    return [returnData];
  }
}
