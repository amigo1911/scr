import { exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

import { Request, Response } from 'express';
import { ToolsSwitch } from '../interfaces/Tools';

const asyncExec = promisify(exec);

const toolsSwitch: ToolsSwitch = {
  'create-next-step': async directory => {
    return await asyncExec(`cd ${directory} && npm run create-next-step`);
  },
  'create-empty-steps': async (directory, num) => {
    return await asyncExec(
      `cd ${directory} && npm run create-empty-steps ${num}`
    );
  },
  'insert-step': async (directory, num) => {
    return await asyncExec(`cd ${directory} && npm run insert-step ${num}`);
  },
  'delete-step': async (directory, num) => {
    return await asyncExec(`cd ${directory} && npm run delete-step ${num}`);
  },
  'update-step-titles': async directory => {
    return await asyncExec(`cd ${directory} && npm run update-step-titles`);
  }
};

export const toolsRoute = async (req: Request, res: Response) => {
  const { superblock, block, command } = req.params;
  const { start } = req.body as Record<string, number>;
  const directory = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'curriculum',
    'challenges',
    'english',
    superblock,
    block
  );

  if (!(command in toolsSwitch)) {
    res.json({ stdout: '', stderr: 'Command not found' });
    return;
  }

  const parsed = command as keyof ToolsSwitch;

  const { stdout, stderr } = await toolsSwitch[parsed](directory, start);
  res.json({ stdout, stderr });
};
