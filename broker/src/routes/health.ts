import express, { Request, Response } from 'express';
import { getSalesforceConnection } from '../services/salesforce';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const conn = getSalesforceConnection();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        broker: 'operational',
        salesforce: conn ? 'connected' : 'disconnected',
      },
      version: process.env.npm_package_version || '1.0.0',
    };

    res.json(health);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        broker: 'operational',
        salesforce: 'disconnected',
      },
      error: error.message,
    });
  }
});

export default router;


