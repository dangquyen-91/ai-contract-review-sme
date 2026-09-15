import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const swaggerYamlPath = path.join(__dirname, '../../swagger.yaml');

export const swaggerSpec = yaml.load(fs.readFileSync(swaggerYamlPath, 'utf8')) as Record<
  string,
  unknown
>;
