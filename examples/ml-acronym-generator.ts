import { SQLiteAcronymManager, MLAcronymGenerator } from '../src';

async function main() {
  // Initialize the SQLite acronym manager
  const db = new SQLiteAcronymManager('acronyms.db');
  
  // Initialize the ML-based acronym generator
  const mlGenerator = new MLAcronymGenerator(db, {
    learningRate: 0.1,
    minSimilarityThreshold: 0.7,
    maxAttempts: 5
  });
  
  // Add some example prompts
  const prompt1 = "The quick brown fox jumps over the lazy dog";
  const prompt2 = "The quick brown fox is a common pangram";
  const prompt3 = "A pangram is a sentence containing every letter of the alphabet";
  const prompt4 = "The lazy dog sleeps all day";
  
  console.log('Adding example prompts...');
  await db.addPrompt(prompt1);
  await db.addPrompt(prompt2);
  await db.addPrompt(prompt3);
  await db.addPrompt(prompt4);
  
  // Process the prompts to find repeated phrases and generate acronyms
  console.log('Processing prompts...');
  await db.processNewPrompts();
  
  // Get all acronyms
  const acronyms = await db.getAllAcronyms();
  console.log('Generated acronyms:');
  acronyms.forEach(acronym => {
    console.log(`- ${acronym.acronym}: ${acronym.expansion}`);
  });
  
  // Demonstrate generating a unique acronym for a new phrase
  const newPhrase = "Machine learning is a subset of artificial intelligence";
  console.log(`\nGenerating acronym for: "${newPhrase}"`);
  const uniqueAcronym = await mlGenerator.generateUniqueAcronym(newPhrase);
  console.log(`Generated acronym: ${uniqueAcronym}`);
  
  // Demonstrate providing feedback to improve the ML model
  console.log('\nProviding feedback to improve the model...');
  await db.provideAcronymFeedback(uniqueAcronym, true);
  
  // Close the database connection
  db.close();
}

main().catch(console.error); 