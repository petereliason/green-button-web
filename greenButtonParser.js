/**
 * Green Button XML Parser
 * Handles parsing of Green Button Atom+XML files containing ESPI resources
 */

class GreenButtonParser {
    constructor() {
        // ESPI namespace
        this.ESPI_NS = 'http://naesb.org/espi';
        this.ATOM_NS = 'http://www.w3.org/2005/Atom';
        
        // Commodity types mapping (from ESPI standard)
        this.COMMODITY_TYPES = {
            0: 'Unknown',
            1: 'Electricity',
            2: 'Gas',
            3: 'Water',
            4: 'Time',
            5: 'Heat',
            6: 'Cooling',
            7: 'Carbon',
            8: 'Carbon dioxide',
            9: 'Nitrogen',
            10: 'Hydrogen',
            11: 'Compressed air'
        };
        
        // Unit of Measure mapping
        this.UOM_TYPES = {
            5: 'A',      // Amperes
            29: 'V',     // Volts  
            31: 'J',     // Joules
            38: 'W',     // Watts
            42: 'm³',    // Cubic meters
            72: 'Wh',    // Watt-hours
            73: 'kWh',   // Kilowatt-hours
            106: 'Ah',   // Ampere-hours
            119: 'ft³',  // Cubic feet
            122: 'gal',  // Gallons
            132: 'VAh',  // Volt-Ampere hours
            140: 'W',    // Watts (active power)
            159: 'Wh',   // Watt-hours (energy)
            169: 'VAR',  // Volt-Ampere reactive
            174: 'VAh'   // Volt-Ampere hours
        };

        // Service categories
        this.SERVICE_CATEGORIES = {
            0: 'Electricity',
            1: 'Gas', 
            2: 'Water',
            3: 'Time',
            4: 'Heat',
            5: 'Cooling'
        };
    }

    /**
     * Parse Green Button XML file
     * @param {string} xmlString - XML content as string
     * @returns {Object} Parsed data structure
     */
    async parseXML(xmlString) {
        try {
            // Parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            
            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error(`XML parsing error: ${parserError.textContent}`);
            }

            // Get the feed element
            const feed = xmlDoc.querySelector('feed');
            if (!feed) {
                throw new Error('Invalid Green Button file: No feed element found');
            }

            // Initialize data structure
            const parsedData = {
                metadata: {
                    feedId: this.getTextContent(feed, 'id'),
                    feedTitle: this.getTextContent(feed, 'title'),
                    updated: this.getTextContent(feed, 'updated'),
                    totalEntries: 0
                },
                usagePoints: new Map(),
                meterReadings: new Map(),
                intervalBlocks: new Map(),
                readingTypes: new Map(),
                localTimeParameters: new Map(),
                usageSummaries: new Map(),
                relationships: {
                    usagePointToMeterReadings: new Map(),
                    meterReadingToIntervalBlocks: new Map(),
                    meterReadingToReadingTypes: new Map()
                }
            };

            // Parse all entries
            const entries = xmlDoc.querySelectorAll('entry');
            parsedData.metadata.totalEntries = entries.length;

            for (const entry of entries) {
                await this.parseEntry(entry, parsedData);
            }

            // Build relationships
            this.buildRelationships(parsedData);

            return parsedData;

        } catch (error) {
            throw new Error(`Failed to parse Green Button XML: ${error.message}`);
        }
    }

    /**
     * Parse individual entry from Atom feed
     */
    async parseEntry(entry, parsedData) {
        const entryId = this.getTextContent(entry, 'id');
        const content = entry.querySelector('content');
        
        if (!content) {
            return; // Skip entries without content
        }

        // Extract links for relationship building
        const links = this.extractLinks(entry);

        // Parse different ESPI resource types
        const usagePoint = content.querySelector('UsagePoint, espi\\:UsagePoint');
        const meterReading = content.querySelector('MeterReading, espi\\:MeterReading');
        const intervalBlock = content.querySelector('IntervalBlock, espi\\:IntervalBlock');
        const readingType = content.querySelector('ReadingType, espi\\:ReadingType');
        const localTimeParams = content.querySelector('LocalTimeParameters, espi\\:LocalTimeParameters');
        const usageSummary = content.querySelector('UsageSummary, espi\\:UsageSummary, ElectricPowerUsageSummary, espi\\:ElectricPowerUsageSummary');

        if (usagePoint) {
            parsedData.usagePoints.set(entryId, this.parseUsagePoint(usagePoint, entryId, links));
        } else if (meterReading) {
            parsedData.meterReadings.set(entryId, this.parseMeterReading(meterReading, entryId, links));
        } else if (intervalBlock) {
            parsedData.intervalBlocks.set(entryId, this.parseIntervalBlock(intervalBlock, entryId, links));
        } else if (readingType) {
            parsedData.readingTypes.set(entryId, this.parseReadingType(readingType, entryId));
        } else if (localTimeParams) {
            parsedData.localTimeParameters.set(entryId, this.parseLocalTimeParameters(localTimeParams, entryId));
        } else if (usageSummary) {
            parsedData.usageSummaries.set(entryId, this.parseUsageSummary(usageSummary, entryId));
        }
    }

    /**
     * Extract links from entry for relationship mapping
     */
    extractLinks(entry) {
        const links = {};
        const linkElements = entry.querySelectorAll('link');
        
        for (const link of linkElements) {
            const rel = link.getAttribute('rel');
            const href = link.getAttribute('href');
            if (rel && href) {
                if (!links[rel]) {
                    links[rel] = [];
                }
                links[rel].push(href);
            }
        }
        
        return links;
    }

    /**
     * Parse UsagePoint element
     */
    parseUsagePoint(element, entryId, links) {
        const serviceCategory = element.querySelector('ServiceCategory, espi\\:ServiceCategory');
        const serviceCategoryKind = serviceCategory ? 
            this.getTextContent(serviceCategory, 'kind') : null;

        return {
            id: entryId,
            serviceCategory: serviceCategoryKind ? {
                kind: parseInt(serviceCategoryKind),
                description: this.SERVICE_CATEGORIES[parseInt(serviceCategoryKind)] || 'Unknown'
            } : null,
            links: links,
            description: this.getTextContent(element, 'description') || null
        };
    }

    /**
     * Parse MeterReading element
     */
    parseMeterReading(element, entryId, links) {
        return {
            id: entryId,
            links: links,
            // MeterReading is typically just a container
        };
    }

    /**
     * Parse ReadingType element
     */
    parseReadingType(element, entryId) {
        const commodity = this.getTextContent(element, 'commodity');
        const uom = this.getTextContent(element, 'uom');
        const powerMultiplier = this.getTextContent(element, 'powerOfTenMultiplier');

        return {
            id: entryId,
            accumulationBehaviour: parseInt(this.getTextContent(element, 'accumulationBehaviour')) || null,
            commodity: commodity ? {
                code: parseInt(commodity),
                description: this.COMMODITY_TYPES[parseInt(commodity)] || 'Unknown'
            } : null,
            currency: parseInt(this.getTextContent(element, 'currency')) || null,
            dataQualifier: parseInt(this.getTextContent(element, 'dataQualifier')) || null,
            flowDirection: parseInt(this.getTextContent(element, 'flowDirection')) || null,
            intervalLength: parseInt(this.getTextContent(element, 'intervalLength')) || null,
            kind: parseInt(this.getTextContent(element, 'kind')) || null,
            phase: parseInt(this.getTextContent(element, 'phase')) || null,
            powerOfTenMultiplier: powerMultiplier ? parseInt(powerMultiplier) : 0,
            timeAttribute: parseInt(this.getTextContent(element, 'timeAttribute')) || null,
            uom: uom ? {
                code: parseInt(uom),
                description: this.UOM_TYPES[parseInt(uom)] || 'Unknown'
            } : null
        };
    }

    /**
     * Parse IntervalBlock element - contains the actual meter readings
     */
    parseIntervalBlock(element, entryId, links) {
        const intervalElement = element.querySelector('interval, espi\\:interval');
        const intervalReadings = element.querySelectorAll('IntervalReading, espi\\:IntervalReading');

        const interval = intervalElement ? {
            duration: parseInt(this.getTextContent(intervalElement, 'duration')) || null,
            start: parseInt(this.getTextContent(intervalElement, 'start')) || null
        } : null;

        const readings = [];
        for (const reading of intervalReadings) {
            const timePeriod = reading.querySelector('timePeriod, espi\\:timePeriod');
            const readingValue = this.getTextContent(reading, 'value');
            const cost = this.getTextContent(reading, 'cost');

            readings.push({
                cost: cost ? parseInt(cost) : null,
                timePeriod: timePeriod ? {
                    duration: parseInt(this.getTextContent(timePeriod, 'duration')) || null,
                    start: parseInt(this.getTextContent(timePeriod, 'start')) || null
                } : null,
                value: readingValue ? parseInt(readingValue) : null,
                qualityFlags: this.getTextContent(reading, 'qualityFlags') || null
            });
        }

        return {
            id: entryId,
            interval: interval,
            intervalReadings: readings,
            links: links
        };
    }

    /**
     * Parse LocalTimeParameters element
     */
    parseLocalTimeParameters(element, entryId) {
        return {
            id: entryId,
            dstEndRule: this.getTextContent(element, 'dstEndRule') || null,
            dstOffset: parseInt(this.getTextContent(element, 'dstOffset')) || null,
            dstStartRule: this.getTextContent(element, 'dstStartRule') || null,
            tzOffset: parseInt(this.getTextContent(element, 'tzOffset')) || null
        };
    }

    /**
     * Parse UsageSummary or ElectricPowerUsageSummary element
     */
    parseUsageSummary(element, entryId) {
        const billingPeriod = element.querySelector('billingPeriod, espi\\:billingPeriod');
        const overallConsumption = element.querySelector('overallConsumptionLastPeriod, espi\\:overallConsumptionLastPeriod');
        
        return {
            id: entryId,
            billingPeriod: billingPeriod ? {
                duration: parseInt(this.getTextContent(billingPeriod, 'duration')) || null,
                start: parseInt(this.getTextContent(billingPeriod, 'start')) || null
            } : null,
            billLastPeriod: parseInt(this.getTextContent(element, 'billLastPeriod')) || null,
            billToDate: parseInt(this.getTextContent(element, 'billToDate')) || null,
            overallConsumptionLastPeriod: overallConsumption ? {
                powerOfTenMultiplier: parseInt(this.getTextContent(overallConsumption, 'powerOfTenMultiplier')) || 0,
                uom: parseInt(this.getTextContent(overallConsumption, 'uom')) || null,
                value: parseInt(this.getTextContent(overallConsumption, 'value')) || null
            } : null,
            currency: parseInt(this.getTextContent(element, 'currency')) || null
        };
    }

    /**
     * Build relationships between entities based on links
     */
    buildRelationships(parsedData) {
        // Build UsagePoint to MeterReading relationships
        for (const [upId, usagePoint] of parsedData.usagePoints) {
            const relatedLinks = usagePoint.links.related || [];
            const meterReadingLinks = relatedLinks.filter(link => link.includes('MeterReading'));
            
            if (meterReadingLinks.length > 0) {
                parsedData.relationships.usagePointToMeterReadings.set(upId, []);
                for (const mrId of parsedData.meterReadings.keys()) {
                    // Simple matching - in a real implementation, you'd parse the URLs properly
                    parsedData.relationships.usagePointToMeterReadings.get(upId).push(mrId);
                }
            }
        }

        // Build MeterReading to IntervalBlock relationships
        for (const [mrId, meterReading] of parsedData.meterReadings) {
            const relatedLinks = meterReading.links.related || [];
            const intervalBlockLinks = relatedLinks.filter(link => link.includes('IntervalBlock'));
            
            if (intervalBlockLinks.length > 0) {
                parsedData.relationships.meterReadingToIntervalBlocks.set(mrId, []);
                for (const ibId of parsedData.intervalBlocks.keys()) {
                    parsedData.relationships.meterReadingToIntervalBlocks.get(mrId).push(ibId);
                }
            }
        }

        // Build MeterReading to ReadingType relationships
        for (const [mrId, meterReading] of parsedData.meterReadings) {
            const relatedLinks = meterReading.links.related || [];
            const readingTypeLinks = relatedLinks.filter(link => link.includes('ReadingType'));
            
            if (readingTypeLinks.length > 0) {
                for (const rtId of parsedData.readingTypes.keys()) {
                    if (!parsedData.relationships.meterReadingToReadingTypes.has(mrId)) {
                        parsedData.relationships.meterReadingToReadingTypes.set(mrId, []);
                    }
                    parsedData.relationships.meterReadingToReadingTypes.get(mrId).push(rtId);
                }
            }
        }
    }

    /**
     * Helper method to get text content from XML element
     */
    getTextContent(parent, tagName) {
        // Try both with and without namespace prefix
        const element = parent.querySelector(tagName) || 
                       parent.querySelector(`espi\\:${tagName}`) ||
                       parent.querySelector(`*[localName="${tagName}"]`);
        return element ? element.textContent.trim() : null;
    }

    /**
     * Convert Unix timestamp to ISO 8601 date string
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return null;
        return new Date(timestamp * 1000).toISOString();
    }

    /**
     * Convert parsed data to flat structure suitable for CSV export
     */
    toFlatData(parsedData) {
        const flatData = [];

        // Iterate through usage points and their related data
        for (const [upId, usagePoint] of parsedData.usagePoints) {
            const relatedMeterReadings = parsedData.relationships.usagePointToMeterReadings.get(upId) || [];
            
            for (const mrId of relatedMeterReadings) {
                const meterReading = parsedData.meterReadings.get(mrId);
                if (!meterReading) continue;

                // Get related reading types
                const relatedReadingTypes = parsedData.relationships.meterReadingToReadingTypes.get(mrId) || [];
                const readingType = relatedReadingTypes.length > 0 ? 
                    parsedData.readingTypes.get(relatedReadingTypes[0]) : null;

                // Get related interval blocks
                const relatedIntervalBlocks = parsedData.relationships.meterReadingToIntervalBlocks.get(mrId) || [];
                
                for (const ibId of relatedIntervalBlocks) {
                    const intervalBlock = parsedData.intervalBlocks.get(ibId);
                    if (!intervalBlock) continue;

                    // Process each interval reading
                    for (const reading of intervalBlock.intervalReadings || []) {
                        // Calculate helpful values based on power multiplier
                        const powerMultiplier = readingType ? readingType.powerOfTenMultiplier : 0;
                        const calculatedValue = reading.value ? reading.value * Math.pow(10, powerMultiplier) : null;
                        const calculatedCostWithMultiplier = reading.cost ? reading.cost * Math.pow(10, powerMultiplier) : null;
                        const calculatedCost = calculatedCostWithMultiplier ? (calculatedCostWithMultiplier / 100).toFixed(2) : null; // Apply multiplier first, then convert from cents
                        
                        flatData.push({
                            usage_point_id: upId,
                            meter_reading_id: mrId,
                            interval_block_id: ibId,
                            reading_type_id: relatedReadingTypes[0] || null,
                            service_category: usagePoint.serviceCategory ? usagePoint.serviceCategory.description : null,
                            commodity: readingType && readingType.commodity ? readingType.commodity.description : null,
                            uom: readingType && readingType.uom ? readingType.uom.description : null,
                            power_multiplier: readingType ? readingType.powerOfTenMultiplier : null,
                            start_time: this.formatTimestamp(reading.timePeriod ? reading.timePeriod.start : null),
                            duration: reading.timePeriod ? reading.timePeriod.duration : null,
                            end_time: reading.timePeriod && reading.timePeriod.start && reading.timePeriod.duration ? 
                                this.formatTimestamp(reading.timePeriod.start + reading.timePeriod.duration) : null,
                            value: reading.value,
                            cost: reading.cost,
                            quality_flags: reading.qualityFlags,
                            interval_length: readingType ? readingType.intervalLength : null,
                            calculated_value: calculatedValue,
                            calculated_cost: calculatedCost
                        });
                    }
                }
            }
        }

        return flatData;
    }
}