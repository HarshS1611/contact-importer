// lib/fieldMapping.ts - Updated to use Firebase document IDs for agent mapping  
import { ContactField, DetectedField, User } from './types'

export class FieldMappingEngine {
  private contactFields: ContactField[]

  constructor(contactFields: ContactField[]) {
    this.contactFields = contactFields
  }

  // Core method: Auto-detect field mappings
  detectFields(headers: string[], sampleRows: string[][]): DetectedField[] {
    console.log('Starting field detection for headers:', headers)

    const detectedFields: DetectedField[] = []

    headers.forEach((header, index) => {
      const cleanHeader = header.toLowerCase().trim()
      console.log(`Analyzing header: "${header}" (index: ${index})`)

      // Get sample data for this column
      const sampleData = sampleRows
        .slice(0, 5) // Take first 5 rows as samples
        .map(row => row[index] || '')
        .filter(value => value && value.trim())

      console.log(`Sample data for "${header}":`, sampleData)

      // Find best matching field
      const bestMatch = this.findBestFieldMatch(cleanHeader, sampleData)
      console.log(`Best match for "${header}":`, bestMatch)

      if (bestMatch) {
        detectedFields.push({
          name: header,
          suggestedMapping: bestMatch.field.id,
          confidence: bestMatch.confidence,
          type: bestMatch.field.core ? 'core' : 'custom',
          samples: sampleData.slice(0, 3) // First 3 samples for preview
        })
      }
    })

    console.log('Field detection completed. Detected fields:', detectedFields)
    return detectedFields
  }

  // Find the best matching field for a header and its data
  private findBestFieldMatch(
    header: string,
    sampleData: string[]
  ): { field: ContactField; confidence: number } | null {

    let bestMatch: { field: ContactField; confidence: number } | null = {
      field: null as any,
      confidence: 0
    }

    this.contactFields.forEach(field => {
      const confidence = this.calculateMatchConfidence(header, sampleData, field)

      if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { field, confidence }
      }
    })

    return bestMatch && bestMatch.confidence > 30 ? bestMatch : null
  }

  // Calculate confidence score for field matching
  private calculateMatchConfidence(
    header: string,
    sampleData: string[],
    field: ContactField
  ): number {
    let confidence = 0

    // Header similarity matching
    const headerScore = this.calculateHeaderSimilarity(header, field)
    confidence += headerScore

    // Data pattern matching
    const dataScore = this.calculateDataPatternScore(sampleData, field)
    confidence += dataScore

    console.log(`Field "${field.id}" vs header "${header}": header=${headerScore}, data=${dataScore}, total=${confidence}`)

    return Math.min(confidence, 100) // Cap at 100%
  }

  // Calculate header similarity score
  private calculateHeaderSimilarity(header: string, field: ContactField): number {
    const headerWords = header.toLowerCase().split(/[\s_-]+/)
    const fieldWords = field.label.toLowerCase().split(/[\s_-]+/)
    const fieldId = field.id.toLowerCase()

    let score = 0

    // Exact match bonus
    if (header === field.label.toLowerCase() || header === fieldId) {
      score += 50
    }

    // Word matching
    headerWords.forEach(headerWord => {
      if (fieldWords.some(fieldWord => fieldWord.includes(headerWord) || headerWord.includes(fieldWord))) {
        score += 20
      }
      if (fieldId.includes(headerWord) || headerWord.includes(fieldId)) {
        score += 15
      }
    })

    // Specific field mappings
    const mappings: Record<string, string[]> = {
      'firstName': ['first', 'fname', 'firstname', 'given', 'forename'],
      'lastName': ['last', 'lname', 'lastname', 'surname', 'family'],
      'email': ['email', 'mail', 'e-mail', 'emailaddress', 'email_address'],
      'phone': ['phone', 'tel', 'telephone', 'mobile', 'cell', 'contact', 'number'],
      'company': ['company', 'organization', 'org', 'business', 'employer', 'firm'],
      'jobTitle': ['title', 'job', 'position', 'role', 'designation', 'jobtitle'],
      'agentUid': ['agent', 'assigned', 'owner', 'rep', 'representative', 'sales'],
      'accountType': ['type', 'category', 'classification', 'account', 'customer']
    }

    if (mappings[field.id]) {
      mappings[field.id].forEach(keyword => {
        if (header.includes(keyword)) {
          score += 25
        }
      })
    }

    return Math.min(score, 60) // Cap header score at 60
  }

  // Calculate data pattern matching score
  private calculateDataPatternScore(sampleData: string[], field: ContactField): number {
    if (sampleData.length === 0) return 0

    let score = 0
    let matches = 0

    sampleData.forEach(value => {
      if (this.matchesFieldType(value, field.type)) {
        matches++
      }
    })

    // Calculate percentage of matches
    const matchPercentage = (matches / sampleData.length) * 100
    score = matchPercentage * 0.4 // Data pattern contributes up to 40 points

    return Math.round(score)
  }

  // Check if a value matches the expected field type
  private matchesFieldType(value: string, fieldType: string): boolean {
    if (!value || !value.trim()) return false

    const trimmedValue = value.trim()

    switch (fieldType) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)

      case 'phone':
        // Phone number patterns (various formats)
        return /^[\+]?[\d\s\-\(\)]{7,20}$/.test(trimmedValue)

      case 'number':
        return !isNaN(Number(trimmedValue))

      case 'datetime':
        return !isNaN(Date.parse(trimmedValue))

      case 'checkbox':
        return ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(trimmedValue.toLowerCase())

      case 'text':
      default:
        return trimmedValue.length > 0
    }
  }

  // Process all rows for import with agent email to Firebase ID mapping
  processAllRowsForImport(
    headers: string[],
    rows: string[][],
    mappings: Record<string, any>,
    users: User[]
  ): Array<Record<string, any>> {
    console.log('Processing', rows.length, 'rows for import with mappings:', mappings)
    console.log('Available users for agent mapping:', users.map(u => ({ id: u.id, email: u.email })))

    // Create email to Firebase document ID lookup
    const emailToAgentUidMap: Record<string, string> = {}
    users.forEach(user => {
      emailToAgentUidMap[user.email.toLowerCase()] = user.id // Use Firebase document ID
    })

    console.log('Email to Agent UID mapping:', emailToAgentUidMap)

    const processedContacts: Array<Record<string, any>> = []

    rows.forEach((row, rowIndex) => {
      const contact: Record<string, any> = {}

      // Map each field according to the mappings
      Object.entries(mappings).forEach(([sourceField, mapping]) => {
        const columnIndex = headers.indexOf(sourceField)
        if (columnIndex === -1) return

        const rawValue = row[columnIndex]
        const targetField = mapping.targetField

        // Clean and process the value
        let processedValue = this.processFieldValue(rawValue, mapping.targetFieldType)

        // ✅ Special handling for agentUid field
        if (targetField === 'agentUid' && processedValue) {
          const emailLower = processedValue.toLowerCase().trim()
          const agentUid = emailToAgentUidMap[emailLower]

          if (agentUid) {
            console.log(`Mapped agent email "${processedValue}" to Firebase ID "${agentUid}"`)
            processedValue = processedValue
          } else {
            console.warn(`Agent email "${processedValue}" not found. Setting as "unassigned"`)
            processedValue = 'unassigned' // ✅ Set as unassigned instead of clearing
          }
        }


        if (processedValue !== null && processedValue !== undefined) {
          contact[targetField] = processedValue
        }
      })

      // Ensure we have some contact data
      if (Object.keys(contact).length > 0) {
        processedContacts.push(contact)
      }
    })

    console.log(`Processed ${processedContacts.length} contacts from ${rows.length} rows`)
    console.log('Sample processed contact:', processedContacts[0])

    return processedContacts
  }

  // Process individual field values based on type
  private processFieldValue(rawValue: string, fieldType: string): string | null {
    if (!rawValue || typeof rawValue !== 'string') return null

    const trimmed = rawValue.trim()
    if (!trimmed) return null

    switch (fieldType) {
      case 'email':
        return trimmed.toLowerCase()

      case 'phone':
        // Clean phone number but preserve the format
        return trimmed.replace(/[^\d\+\-\(\)\s]/g, '').trim()

      case 'number':
        const num = parseFloat(trimmed)
        return isNaN(num) ? null : num.toString()

      case 'checkbox':
        const lower = trimmed.toLowerCase()
        if (['true', '1', 'yes', 'y', 'on'].includes(lower)) return 'true'
        if (['false', '0', 'no', 'n', 'off'].includes(lower)) return 'false'
        return null

      case 'datetime':
        const date = new Date(trimmed)
        return isNaN(date.getTime()) ? null : date.toISOString()

      case 'text':
      default:
        return trimmed
    }
  }

  // Get available core and custom fields for mapping
  getAvailableFields(): ContactField[] {
    return this.contactFields
  }

  // Validate mappings before import
  validateMappings(mappings: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for duplicate mappings
    const targetFields = Object.values(mappings).map((mapping: any) => mapping.targetField)
    const duplicates = targetFields.filter((field, index) => targetFields.indexOf(field) !== index)
    if (duplicates.length > 0) {
      errors.push(`Duplicate mappings found for: ${duplicates.join(', ')}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}