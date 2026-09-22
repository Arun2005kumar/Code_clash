import { Round1Question } from '../types';

export const ROUND_1_QUESTIONS: Round1Question[] = [
  {
    id: 1,
    category: 'Data Structures',
    question: 'What is the time complexity to search for an element in a balanced Binary Search Tree (AVL / Red-Black Tree) containing n elements in the worst case?',
    options: [
      'O(1)',
      'O(log n)',
      'O(n)',
      'O(n log n)'
    ],
    correctAnswer: 1,
    explanation: 'In a balanced BST like AVL or Red-Black Tree, the height of the tree is strictly bounded by O(log n). Therefore, search, insertion, and deletion operations take O(log n) time in the worst case.'
  },
  {
    id: 2,
    category: 'C Programming & Pointers',
    question: 'What is the output of the following C program segment?',
    codeSnippet: `#include <stdio.h>
int main() {
    int arr[] = {10, 20, 30, 40, 50};
    int *p = arr;
    printf("%d", *(p + 3));
    return 0;
}`,
    options: [
      '10',
      '30',
      '40',
      'Address of element 40'
    ],
    correctAnswer: 2,
    explanation: '*(p + 3) accesses the element at offset 3 from the base address of arr. With 0-based indexing: arr[0]=10, arr[1]=20, arr[2]=30, arr[3]=40.'
  },
  {
    id: 3,
    category: 'Stack & Queue',
    question: 'Which of the following data structures is ideally utilized for evaluating or converting Infix expressions to Postfix (Reverse Polish) notation?',
    options: [
      'Priority Queue',
      'Stack',
      'Circular Queue',
      'Doubly Linked List'
    ],
    correctAnswer: 1,
    explanation: 'Dijkstra\'s Shunting Yard algorithm uses a Stack data structure to handle operator precedence and parenthesis matching during infix-to-postfix conversion.'
  },
  {
    id: 4,
    category: 'Python Quirks',
    question: 'What will be printed when this Python snippet executes?',
    codeSnippet: `x = [1, 2, 3]
y = x
y.append(4)
print(len(x))`,
    options: [
      '3',
      '4',
      'TypeError',
      'None'
    ],
    correctAnswer: 1,
    explanation: 'In Python, lists are mutable objects. `y = x` assigns a reference to the same list object in memory. Appending to `y` modifies `x` directly, making its length 4.'
  },
  {
    id: 5,
    category: 'Algorithms',
    question: 'Which sorting algorithm has a worst-case time complexity of O(n log n) and does NOT require extra auxiliary memory (is in-place)?',
    options: [
      'Merge Sort',
      'Quick Sort',
      'Heap Sort',
      'Counting Sort'
    ],
    correctAnswer: 2,
    explanation: 'Heap Sort achieves O(n log n) time complexity in all cases (best, average, worst) while maintaining O(1) auxiliary space (in-place). Merge Sort requires O(n) auxiliary space, and Quick Sort degrades to O(n²) in the worst case.'
  },
  {
    id: 6,
    category: 'Operating Systems',
    question: 'Which condition is NOT one of Coffman\'s four necessary conditions for a Deadlock to occur?',
    options: [
      'Mutual Exclusion',
      'Hold and Wait',
      'Preemption of resources',
      'Circular Wait'
    ],
    correctAnswer: 2,
    explanation: 'The four Coffman conditions are: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. "Preemption" actually prevents deadlocks.'
  },
  {
    id: 7,
    category: 'Graph Theory',
    question: 'Which algorithm finds the single-source shortest paths in a directed weighted graph that may contain negative weight edges (and detects negative weight cycles)?',
    options: [
      'Dijkstra\'s Algorithm',
      'Bellman-Ford Algorithm',
      'Prim\'s Algorithm',
      'Kruskal\'s Algorithm'
    ],
    correctAnswer: 1,
    explanation: 'The Bellman-Ford algorithm works on graphs with negative edge weights and can detect negative weight cycles in O(V * E) time, whereas Dijkstra\'s algorithm fails on graphs with negative weight edges.'
  },
  {
    id: 8,
    category: 'DBMS & SQL',
    question: 'In relational database theory, which Normal Form guarantees that every non-prime attribute is fully functionally dependent on the primary key (eliminating partial dependencies)?',
    options: [
      'First Normal Form (1NF)',
      'Second Normal Form (2NF)',
      'Third Normal Form (3NF)',
      'Boyce-Codd Normal Form (BCNF)'
    ],
    correctAnswer: 1,
    explanation: '2NF requires a relation to be in 1NF and ensure that no non-prime attribute is dependent on a proper subset of any candidate key (no partial dependency).'
  },
  {
    id: 9,
    category: 'Computer Networks',
    question: 'Which protocol operates at the Transport Layer of the OSI model to provide connection-oriented, reliable, and byte-stream delivery with congestion control?',
    options: [
      'UDP (User Datagram Protocol)',
      'IP (Internet Protocol)',
      'TCP (Transmission Control Protocol)',
      'ICMP (Internet Control Message Protocol)'
    ],
    correctAnswer: 2,
    explanation: 'TCP (Transmission Control Protocol) operates at Layer 4 (Transport Layer) and guarantees reliable, ordered, and error-checked delivery of a stream of octets.'
  },
  {
    id: 10,
    category: 'Object Oriented Programming',
    question: 'In C++ or Java, when a derived class provides a specific implementation of a method that is already defined in its base class, this concept is known as:',
    options: [
      'Method Overloading',
      'Method Overriding',
      'Dynamic Binding without Polymorphism',
      'Encapsulation'
    ],
    correctAnswer: 1,
    explanation: 'Method Overriding occurs when a subclass redefines a method from its superclass with the exact same signature and return type for runtime polymorphism.'
  }
];
