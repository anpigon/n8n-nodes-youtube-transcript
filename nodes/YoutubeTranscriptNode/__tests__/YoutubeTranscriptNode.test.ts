import type { IExecuteFunctions } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';
import { YoutubeTranscriptNode } from '../YoutubeTranscriptNode.node';

jest.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: jest.fn().mockResolvedValue([
      { text: 'Test transcript 1', duration: 1, offset: 0 },
      { text: 'Test transcript 2', duration: 1, offset: 1 },
    ]),
  },
}));

describe('YoutubeTranscriptNode', () => {
  let node: YoutubeTranscriptNode;
  let executeFunctions: IExecuteFunctions;

  beforeEach(() => {
    node = new YoutubeTranscriptNode();
    executeFunctions = {
      getNode: jest.fn(),
      getNodeParameter: jest.fn(),
      getInputData: jest.fn().mockReturnValue([{}]),
      continueOnFail: jest.fn().mockReturnValue(false),
    } as unknown as IExecuteFunctions;

    jest.clearAllMocks();
  });

  describe('execute', () => {
    const testCases = [
      {
        name: 'should extract transcript with video ID',
        input: 'K5hLY0mytV0',
        expected: 'K5hLY0mytV0',
      },
      {
        name: 'should extract transcript with full YouTube URL',
        input: 'https://www.youtube.com/watch?v=K5hLY0mytV0',
        expected: 'K5hLY0mytV0',
      },
      {
        name: 'should extract transcript with shortened URL',
        input: 'https://youtu.be/K5hLY0mytV0?feature=shared',
        expected: 'K5hLY0mytV0',
      },
    ];

    for (const { name, input, expected } of testCases) {
      it(name, async () => {
        jest.spyOn(executeFunctions, 'getNodeParameter').mockReturnValue(input);

        const result = await node.execute.call(executeFunctions);

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveLength(1);
        expect(result[0][0].json).toEqual({
          youtubeId: expected,
          text: 'Test transcript 1 Test transcript 2 ',
        });
      });
    }

    it('should handle invalid video ID', async () => {
      const invalidUrl = 'https://youtube.com/invalid';
      jest.spyOn(executeFunctions, 'getNodeParameter').mockReturnValue(invalidUrl);

      await expect(async () => {
        await node.execute.call(executeFunctions);
      }).rejects.toThrow(ApplicationError);
    });

    it('should handle error from YoutubeTranscript API', async () => {
      const youtubeTranscript = require('youtube-transcript');
      jest.spyOn(youtubeTranscript.YoutubeTranscript, 'fetchTranscript')
        .mockRejectedValue(new Error('Failed to fetch transcript'));

      jest.spyOn(executeFunctions, 'getNodeParameter').mockReturnValue('K5hLY0mytV0');

      await expect(async () => {
        await node.execute.call(executeFunctions);
      }).rejects.toThrow('Failed to extract transcript: Failed to fetch transcript');
    });
  });
});
