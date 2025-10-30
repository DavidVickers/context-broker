import { Router, Request, Response } from 'express';
import { getAuthenticatedSalesforceConnectionByContextId } from '../services/salesforce';

const router = Router();

// Explore org schema and records
router.get('/org', async (req: Request, res: Response) => {
  const contextId = req.query.contextId as string;
  
  if (!contextId) {
    return res.status(400).json({ error: 'contextId required' });
  }

  try {
    const conn = await getAuthenticatedSalesforceConnectionByContextId(contextId);
    if (!conn) {
      return res.status(401).json({ error: 'No authenticated connection found' });
    }

    console.log('🔍 Exploring Salesforce Org...');

    // 1. Get org info
    const orgInfo = await conn.query('SELECT Id, Name, OrganizationType, Country, State FROM Organization LIMIT 1');
    
    // 2. List all custom objects
    const customObjects = await conn.describeGlobal();
    const customObjectsList = customObjects.sobjects
      .filter(obj => obj.custom)
      .map(obj => ({ name: obj.name, label: obj.label }));

    // 3. Check Form_Definition__c object
    const formDefDescribe = await conn.describe('Form_Definition__c');
    const formDefFields = formDefDescribe.fields.map(field => ({
      name: field.name,
      type: field.type,
      label: field.label,
      required: field.nillable === false
    }));

    // 4. Get Form_Definition__c records
    const formRecords = await conn.query('SELECT Id, Name, Form_Id__c, Active__c, CreatedDate FROM Form_Definition__c ORDER BY CreatedDate DESC');

    // 5. Check Form_Submission__c object
    const formSubDescribe = await conn.describe('Form_Submission__c');
    const formSubFields = formSubDescribe.fields.map(field => ({
      name: field.name,
      type: field.type,
      label: field.label,
      required: field.nillable === false
    }));

    // 6. Get Form_Submission__c records (build field list dynamically based on actual fields)
    const subFieldNames = formSubDescribe.fields.map(f => f.name);
    const wantedSubFields = ['Id','Name','Context_ID__c','Session_ID__c','Status__c','CreatedDate'];
    const availableSubFields = wantedSubFields.filter(f => subFieldNames.includes(f));
    const subSelect = availableSubFields.join(', ');
    const subQuery = `SELECT ${subSelect || 'Id, Name, CreatedDate'} FROM Form_Submission__c ORDER BY CreatedDate DESC LIMIT 10`;
    const subRecords = await conn.query(subQuery);

    // 7. Check for vehicle-related data
    let vehicleProducts: any[] = [];
    try {
      const products = await conn.query('SELECT Id, Name, ProductCode, Family, IsActive FROM Product2 WHERE Family LIKE \'%Vehicle%\' OR Name LIKE \'%Car%\' OR Name LIKE \'%Auto%\' LIMIT 5');
      vehicleProducts = products.records;
    } catch (error) {
      console.log('No Product2 records found or accessible');
    }

    // 8. Check for vehicle-related custom objects
    const vehicleObjects = customObjects.sobjects
      .filter(obj => obj.custom && (obj.name.toLowerCase().includes('vehicle') || obj.name.toLowerCase().includes('car') || obj.name.toLowerCase().includes('inventory')))
      .map(obj => ({ name: obj.name, label: obj.label }));

    // 8b. Describe common vehicle-related objects and fetch sample records
    const candidateVehicleObjects = ['Vehicle__c', 'VehicleDefinition__c', 'InventoryItem__c', 'Product2'];
    const vehicleObjectsDetailed: any[] = [];
    for (const apiName of candidateVehicleObjects) {
      try {
        const describe = await conn.describe(apiName);
        const fields = describe.fields.map(f => ({ name: f.name, type: f.type, label: f.label }));
        let sample: any[] = [];
        try {
          const query = `SELECT Id, Name FROM ${apiName} ORDER BY CreatedDate DESC LIMIT 5`;
          const result = await conn.query(query);
          sample = result.records;
        } catch (innerErr: any) {
          console.log(`No sample records for ${apiName}:`, innerErr.message);
        }
        vehicleObjectsDetailed.push({ object: apiName, label: describe.label, fields, sampleRecords: sample });
      } catch (e: any) {
        // ignore if object doesn't exist
      }
    }

    // 9. Check standard objects
    const standardObjects = customObjects.sobjects
      .filter(obj => !obj.custom && ['Account', 'Contact', 'Lead', 'Opportunity', 'Product2', 'Pricebook2', 'PricebookEntry'].includes(obj.name))
      .map(obj => ({ name: obj.name, label: obj.label }));

    const exploration = {
      orgInfo: orgInfo.records[0],
      customObjects: customObjectsList,
      formDefinition: {
        label: formDefDescribe.label,
        fields: formDefFields,
        recordCount: formRecords.totalSize,
        records: formRecords.records
      },
      formSubmission: {
        label: formSubDescribe.label,
        fields: formSubFields,
        recordCount: subRecords.totalSize,
        records: subRecords.records
      },
      vehicleData: {
        products: vehicleProducts,
        customObjects: vehicleObjects,
        details: vehicleObjectsDetailed
      },
      standardObjects: standardObjects
    };

    res.json(exploration);

  } catch (error: any) {
    console.error('❌ Error exploring org:', error);
    res.status(500).json({
      error: 'Failed to explore org',
      message: error.message
    });
  }
});

// Get detailed info about a specific object
router.get('/object/:objectName', async (req: Request, res: Response) => {
  const { objectName } = req.params;
  const contextId = req.query.contextId as string;
  
  if (!contextId) {
    return res.status(400).json({ error: 'contextId required' });
  }

  try {
    const conn = await getAuthenticatedSalesforceConnectionByContextId(contextId);
    if (!conn) {
      return res.status(401).json({ error: 'No authenticated connection found' });
    }

    const describe = await conn.describe(objectName);
    const fields = describe.fields.map(field => ({
      name: field.name,
      type: field.type,
      label: field.label,
      required: field.nillable === false,
      length: field.length,
      picklistValues: field.picklistValues || null
    }));

    // Get sample records
    let sampleRecords: any[] = [];
    try {
      const query = `SELECT Id, Name FROM ${objectName} LIMIT 5`;
      const result = await conn.query(query);
      sampleRecords = result.records;
    } catch (error: any) {
      console.log(`Could not query ${objectName}:`, error.message);
    }

    res.json({
      objectName,
      label: describe.label,
      fields,
      sampleRecords
    });

  } catch (error: any) {
    console.error(`❌ Error exploring object ${objectName}:`, error);
    res.status(500).json({
      error: 'Failed to explore object',
      message: error.message
    });
  }
});

export default router;
