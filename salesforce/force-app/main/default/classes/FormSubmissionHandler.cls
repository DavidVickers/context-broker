/**
 * FormSubmissionHandler
 * 
 * Handles form submissions from the broker layer
 * Provides methods to process form data and create/update records
 */
public with sharing class FormSubmissionHandler {
    
    /**
     * Process form submission data
     * @param formId The unique identifier for the form
     * @param formData JSON string containing form field data
     * @return Id of the created Form_Submission__c record
     */
    @AuraEnabled
    public static String processFormSubmission(String formId, String formData) {
        try {
            // Get form definition
            Form_Definition__c formDef = getFormDefinition(formId);
            if (formDef == null) {
                throw new FormSubmissionException('Form definition not found: ' + formId);
            }

            // Parse form data
            Map<String, Object> dataMap = (Map<String, Object>) JSON.deserializeUntyped(formData);
            
            // Create submission record
            Form_Submission__c submission = new Form_Submission__c();
            submission.Form_Definition__c = formDef.Id;
            submission.Form_Id__c = formId;
            submission.Submission_Data__c = formData;
            submission.Status__c = 'Submitted';
            
            insert submission;

            // Process mappings if they exist
            if (formDef.Mapping_Rules__c != null) {
                processMappings(formDef, dataMap, submission.Id);
            }

            return submission.Id;
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error processing form submission: ' + e.getMessage());
            throw new FormSubmissionException('Failed to process form submission: ' + e.getMessage());
        }
    }

    /**
     * Get form definition by form ID
     * @param formId The unique identifier for the form
     * @return Form_Definition__c record
     */
    public static Form_Definition__c getFormDefinition(String formId) {
        List<Form_Definition__c> forms = [
            SELECT Id, Name, Form_Id__c, Fields_JSON__c, Mapping_Rules__c, Active__c
            FROM Form_Definition__c
            WHERE (Form_Id__c = :formId OR Name = :formId)
            AND Active__c = true
            LIMIT 1
        ];
        
        return forms.isEmpty() ? null : forms[0];
    }

    /**
     * Process field mappings to create related records
     * @param formDef Form definition with mapping rules
     * @param formData Parsed form data
     * @param submissionId Form submission record ID
     */
    private static void processMappings(
        Form_Definition__c formDef,
        Map<String, Object> formData,
        Id submissionId
    ) {
        try {
            Map<String, Object> mappingRules = (Map<String, Object>) JSON.deserializeUntyped(
                formDef.Mapping_Rules__c
            );
            
            String targetObject = (String) mappingRules.get('salesforceObject');
            if (String.isBlank(targetObject)) {
                return;
            }

            Map<String, Object> fieldMappings = (Map<String, Object>) mappingRules.get('fieldMappings');
            
            // Create record in target object
            sObject targetRecord = Schema.getGlobalDescribe().get(targetObject).newSObject();
            
            // Apply field mappings
            if (fieldMappings != null) {
                for (String formField : fieldMappings.keySet()) {
                    String sfField = (String) fieldMappings.get(formField);
                    if (formData.containsKey(formField)) {
                        targetRecord.put(sfField, formData.get(formField));
                    }
                }
            }
            
            // Link to submission
            if (targetRecord.getSObjectType().getDescribe().fields.getMap().containsKey('Form_Submission__c')) {
                targetRecord.put('Form_Submission__c', submissionId);
            }
            
            insert targetRecord;
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error processing mappings: ' + e.getMessage());
            // Don't throw - submission was already created
        }
    }

    /**
     * Custom exception class
     */
    public class FormSubmissionException extends Exception {}
}






