/**
 * Test class for FormSubmissionHandler
 */
@isTest
private class FormSubmissionHandlerTest {
    
    @TestSetup
    static void setup() {
        // Create test form definition
        Form_Definition__c formDef = new Form_Definition__c(
            Name = 'Test Form',
            Form_Id__c = 'test-form-001',
            Active__c = true,
            Fields_JSON__c = '[{"name":"firstName","label":"First Name","type":"text","required":true}]',
            Mapping_Rules__c = '{"salesforceObject":"Contact","fieldMappings":{"firstName":"FirstName"}}'
        );
        insert formDef;
    }
    
    @isTest
    static void testProcessFormSubmission_Success() {
        String formId = 'test-form-001';
        String formData = '{"firstName":"John","lastName":"Doe"}';
        
        Test.startTest();
        String submissionId = FormSubmissionHandler.processFormSubmission(formId, formData);
        Test.stopTest();
        
        System.assertNotEquals(null, submissionId, 'Submission ID should not be null');
        
        // Verify submission was created
        List<Form_Submission__c> submissions = [
            SELECT Id, Form_Id__c, Status__c
            FROM Form_Submission__c
            WHERE Id = :submissionId
        ];
        
        System.assertEquals(1, submissions.size(), 'One submission should be created');
        System.assertEquals('Submitted', submissions[0].Status__c, 'Status should be Submitted');
    }
    
    @isTest
    static void testProcessFormSubmission_FormNotFound() {
        String formId = 'non-existent-form';
        String formData = '{"test":"data"}';
        
        Test.startTest();
        try {
            FormSubmissionHandler.processFormSubmission(formId, formData);
            System.assert(false, 'Expected exception was not thrown');
        } catch (FormSubmissionHandler.FormSubmissionException e) {
            System.assert(e.getMessage().contains('Form definition not found'), 
                         'Exception message should indicate form not found');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testGetFormDefinition() {
        String formId = 'test-form-001';
        
        Test.startTest();
        Form_Definition__c formDef = FormSubmissionHandler.getFormDefinition(formId);
        Test.stopTest();
        
        System.assertNotEquals(null, formDef, 'Form definition should be found');
        System.assertEquals('test-form-001', formDef.Form_Id__c, 'Form ID should match');
    }
}






