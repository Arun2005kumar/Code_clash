import { Round2Question } from '../types';

import bugImg from '../assets/images/cinematic_bug_1790008784122.jpg';
import firewallImg from '../assets/images/cinematic_firewall_1790008771235.jpg';
import pythonImg from '../assets/images/cinematic_python_1790008810398.jpg';
import trojanImg from '../assets/images/cinematic_trojan_1790008828009.jpg';
import cloudImg from '../assets/images/cinematic_cloud_1790008797428.jpg';

export const ROUND_2_QUESTIONS: Round2Question[] = [
  // --- QUESTION 1: Predict the Output (C Pointers) ---
  {
    id: 1,
    type: 'code_output',
    badge: 'Code Output #1',
    title: 'Pointer Arithmetic & Pre/Post Increments',
    prompt: 'Predict the exact console output of this C code execution:',
    language: 'c',
    codeSnippet: `#include <stdio.h>

int main() {
    int arr[] = {10, 20, 30, 40, 50};
    int *ptr = arr;
    
    *ptr++;
    printf("%d, ", *ptr);
    
    (*ptr)++;
    printf("%d, ", *ptr);
    
    *++ptr;
    printf("%d", *ptr);
    
    return 0;
}`,
    options: [
      '20, 21, 30',
      '10, 20, 30',
      '20, 20, 30',
      '11, 21, 31'
    ],
    correctAnswerIndex: 0,
    explanation: '1. `*ptr++` evaluates `*ptr` then increments pointer `ptr` to point to arr[1] (20). Printing `*ptr` outputs 20.\n2. `(*ptr)++` increments the value at `ptr` from 20 to 21. Printing `*ptr` outputs 21.\n3. `*++ptr` increments pointer `ptr` to arr[2] (30) and dereferences it. Output: 20, 21, 30.',
    hint: 'Pay close attention to operator precedence between postfix `++`, prefix `++`, and dereference `*`.'
  },

  // --- QUESTION 2: Which Code is Correct (Cycle Detection) ---
  {
    id: 2,
    type: 'code_correction',
    badge: 'Which Code is Correct? #1',
    title: 'Floyd\'s Cycle-Finding Algorithm (Tortoise & Hare)',
    prompt: 'Which of the following implementations correctly and safely detects if a Singly Linked List has a cycle without null pointer dereference crashes?',
    language: 'python',
    codeSnippet: `# Implementation A:
def has_cycle_A(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False

# Implementation B:
def has_cycle_B(head):
    slow = fast = head
    while slow != fast:
        if fast is None or fast.next is None:
            return False
        slow = slow.next
        fast = fast.next.next
    return True

# Implementation C:
def has_cycle_C(head):
    while head:
        if head.visited: return True
        head.visited = True
        head = head.next
    return False`,
    options: [
      'Implementation A is the only safe standard Floyd\'s Cycle Detection',
      'Implementation B is correct because the loop condition checks slow != fast first',
      'Implementation C is optimal because it modifies node attributes dynamically',
      'Both Implementation A and B are identical and both crash on empty list'
    ],
    correctAnswerIndex: 0,
    explanation: 'Implementation A correctly checks `while fast and fast.next:` preventing any AttributeError if fast or fast.next is None. Implementation B fails immediately because `slow` and `fast` both initialize to `head`, so `slow != fast` is False right at the start!',
    hint: 'Trace the first loop iteration: what are slow and fast initialized to?'
  },

  // --- QUESTION 3: Predict the Output (Python Mutable Defaults) ---
  {
    id: 3,
    type: 'code_output',
    badge: 'Code Output #2',
    title: 'The Infamous Mutable Default Argument Trap',
    prompt: 'What will be printed to stdout when this Python script finishes running?',
    language: 'python',
    codeSnippet: `def add_item(item, basket=[]):
    basket.append(item)
    return basket

list1 = add_item("🍎")
list2 = add_item("🍌", [])
list3 = add_item("🍇")

print(list1)
print(list3)`,
    options: [
      '["🍎"] and ["🍇"]',
      '["🍎", "🍇"] and ["🍎", "🍇"]',
      '["🍎", "🍌", "🍇"] and ["🍇"]',
      'TypeError: default parameter redefinition'
    ],
    correctAnswerIndex: 1,
    explanation: 'Python\'s default arguments are evaluated ONCE when the function is defined, not each time it is called! Therefore, `basket=[]` is shared across calls that do not supply an explicit list. Call 1 appends 🍎. Call 2 uses a new list `[]`. Call 3 reuses the shared list and appends 🍇. Both list1 and list3 point to the exact same list: ["🍎", "🍇"]!',
    hint: 'In Python, default arguments are bound at function definition time, not runtime!'
  },

  // --- QUESTION 4: Which Code is Correct (Binary Search Overflow) ---
  {
    id: 4,
    type: 'code_correction',
    badge: 'Which Code is Correct? #2',
    title: 'The 20-Year-Old Java Binary Search Bug',
    prompt: 'In 2006, Joshua Bloch revealed that standard Binary Search in Java\'s JDK had an integer overflow bug for nearly a decade. Which formula for computing `mid` is immune to 32-bit signed integer overflow when low and high are very large positive integers?',
    language: 'java',
    codeSnippet: `// Option 1:
int mid = (low + high) / 2;

// Option 2:
int mid = low + (high - low) / 2;

// Option 3:
int mid = (low + high) >> 1;

// Option 4:
int mid = high - (low + high) / 2;`,
    options: [
      'Option 1: (low + high) / 2',
      'Option 2: low + (high - low) / 2  (or unsigned shift: (low + high) >>> 1)',
      'Option 3: (low + high) >> 1',
      'Option 4: high - (low + high) / 2'
    ],
    correctAnswerIndex: 1,
    explanation: 'If `low + high` exceeds 2³¹ - 1 (2,147,483,647), it overflows into a negative number, causing `mid` to become negative and throwing ArrayIndexOutOfBoundsException! `low + (high - low) / 2` calculates the difference first, which never overflows.',
    hint: 'Think about what happens when low = 2,000,000,000 and high = 2,100,000,000 in 32-bit signed int.'
  },

  // --- QUESTION 5: Predict the Output (Recursion & String Output) ---
  {
    id: 5,
    type: 'code_output',
    badge: 'Code Output #3',
    title: 'Recursion Call Stack & Unwinding Sequence',
    prompt: 'What sequence of numbers is printed by the recursive function `fun(4)`?',
    language: 'cpp',
    codeSnippet: `#include <iostream>
using namespace std;

void fun(int n) {
    if (n <= 0) return;
    cout << n << " ";
    fun(n - 2);
    cout << n * 10 << " ";
}

int main() {
    fun(4);
    return 0;
}`,
    options: [
      '4 2 20 40',
      '4 2 0 20 40',
      '4 40 2 20',
      '4 2 40 20'
    ],
    correctAnswerIndex: 0,
    explanation: 'Call sequence:\n- fun(4): prints "4 ", calls fun(2)\n- fun(2): prints "2 ", calls fun(0)\n- fun(0): returns immediately\n- fun(2) resumes: prints "20 " and returns\n- fun(4) resumes: prints "40 " and returns\nResult: 4 2 20 40',
    hint: 'Trace the stack push before the recursive call and the stack pop (unwinding) after the recursive call.'
  },

  // --- QUESTION 6: Cinematic Image Puzzle (Grace Hopper's Bug) ---
  {
    id: 6,
    type: 'cinematic_image',
    badge: 'Cinematic Riddle #1',
    title: 'The First Historical Incident of 1947',
    prompt: 'Examine this cinematic noir scene: An engineer with tweezers discovers an actual mechanical insect trapped inside electro-mechanical relay circuits. What universal computer science term was born from this real event?',
    imageSrc: bugImg,
    options: [
      'Software Bug / Debugging',
      'Computer Worm',
      'Trojan Malware',
      'Silicon Glitch'
    ],
    correctAnswerIndex: 0,
    explanation: 'On September 9, 1947, computer pioneer Grace Hopper and her team discovered a real moth trapped inside Relay #70 of the Harvard Mark II computer. They taped the insect into their logbook with the entry: "First actual case of bug being found." Hence, "bug" and "debugging" entered computing folklore!',
    funFact: 'The original logbook with the taped moth is preserved at the Smithsonian National Museum of American History in Washington, D.C.'
  },

  // --- QUESTION 7: Cinematic Image Puzzle (Firewall) ---
  {
    id: 7,
    type: 'cinematic_image',
    badge: 'Cinematic Riddle #2',
    title: 'The Burning Fortress of Cyber Defense',
    prompt: 'Look at this futuristic cinematic shot: A blazing digital barrier of plasma fire and high-frequency forcefields stands between a dark cyber highway and glowing city servers. What fundamental network security system does this represent?',
    imageSrc: firewallImg,
    options: [
      'Firewall',
      'Demilitarized Zone (DMZ)',
      'Honeypot Decoy',
      'Virtual Private Network (VPN)'
    ],
    correctAnswerIndex: 0,
    explanation: 'A Firewall is a network security device or software that monitors incoming and outgoing network traffic, deciding whether to permit or block specific packets based on defined security rules. The metaphor originated from real architectural firewalls built to prevent physical fire from spreading between buildings.',
    funFact: 'The term "Firewall" was popularized in networking by Steven M. Bellovin and William R. Cheswick in their landmark 1994 book "Firewalls and Internet Security".'
  },

  // --- QUESTION 8: Cinematic Image Puzzle (Python) ---
  {
    id: 8,
    type: 'cinematic_image',
    badge: 'Cinematic Riddle #3',
    title: 'The Emerald Serpent of Algorithms',
    prompt: 'In this cyberpunk cinematic render, an emerald-glowing digital cyber serpent is coiled around high-performance computer motherboards. Which dominant programming language does this signify?',
    imageSrc: pythonImg,
    options: [
      'Python',
      'Anaconda Script',
      'ViperLang',
      'Rust'
    ],
    correctAnswerIndex: 0,
    explanation: 'Python was created by Dutch programmer Guido van Rossum and first released in 1991. Van Rossum was reading the published scripts from BBC comedy series "Monty Python\'s Flying Circus" and chose the name because he wanted something short, unique, and slightly mysterious!',
    funFact: 'Despite its snake logo, Python is officially named after the British comedy troupe Monty Python, not the reptile!'
  },

  // --- QUESTION 9: Cinematic Image Puzzle (Trojan Horse) ---
  {
    id: 9,
    type: 'cinematic_image',
    badge: 'Cinematic Riddle #4',
    title: 'The Greek Myth Turned Digital Threat',
    prompt: 'A colossal mechanical horse made of glowing cyber circuitry and hidden malicious code approaches the golden entrance of a server fortress. What category of cyber attack does this portray?',
    imageSrc: trojanImg,
    options: [
      'Trojan Horse',
      'Ransomware Extortion',
      'Distributed Denial of Service (DDoS)',
      'SQL Injection'
    ],
    correctAnswerIndex: 0,
    explanation: 'A Trojan Horse is a type of malicious code or software that disguises itself as legitimate or harmless software (like a game or utility) to trick users into loading and executing it. Once activated, it gives unauthorized remote access or steals sensitive data.',
    funFact: 'The first recognized PC Trojan was the AIDS Information Trojan in 1989, distributed via 20,000 floppy disks mailed to AIDS conference attendees!'
  },

  // --- QUESTION 10: Funny Emoji Decoders (CSE Brain Teaser) ---
  {
    id: 10,
    type: 'emoji_riddle',
    badge: 'Emoji Cipher #1',
    title: 'The CSE Department Emoji Decoder Challenge!',
    prompt: 'Decode this hilarious CSE Emoji Cipher! Which cybercrime attack is represented by: 🎣 + 📧 + 🔑 + 💳 ?',
    emojis: ['🎣', '📧', '🔑', '💳'],
    options: [
      'Phishing Attack (Luring victims via fake email to steal credentials & money)',
      'Cookie Stealing via Browser Injection',
      'Spaghetti Code Deployment',
      'Brute Force Password Cracking'
    ],
    correctAnswerIndex: 0,
    explanation: '🎣 (Fishing rod) + 📧 (Email) + 🔑 (Password/Keys) + 💳 (Credit card / Money) = Phishing Attack! Attackers use deceptive emails as "bait" to hook unsuspecting users into revealing private credentials and banking details.',
    funFact: 'Bonus Emoji Decoders:\n🍪 + 🌐 = HTTP Web Cookie\n🍝 + 💻 = Spaghetti Code\n🐛 + 🔍 = Debugging\n☁️ + 🖥️ = Cloud Computing'
  }
];

export const INITIAL_TEAMS = [
  {
    id: 'team-1',
    name: '',
    avatar: '⚡',
    color: 'from-amber-500 to-orange-600',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    coins: 100,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    bidsWon: 0
  },
  {
    id: 'team-2',
    name: 'Cyber Knights',
    avatar: '🛡️',
    color: 'from-blue-500 to-cyan-600',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    coins: 100,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    bidsWon: 0
  },
  {
    id: 'team-3',
    name: 'Nexus Coders',
    avatar: '🚀',
    color: 'from-emerald-500 to-teal-600',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    coins: 100,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    bidsWon: 0
  },
  {
    id: 'team-4',
    name: 'Binary Beasts',
    avatar: '👾',
    color: 'from-purple-500 to-pink-600',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    coins: 100,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    bidsWon: 0
  }
];
