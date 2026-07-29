#include <stdio.h>
#include <stdlib.h>

struct Node
{
    int data;
    struct Node *next;
};

void printList(struct Node *head)
{
    struct Node* current = head;
    while(current != NULL){
        printf("%d ->", current->data);
        current = current->next;
    }
}
int main()
{
    struct Node *head = (struct Node *)malloc(sizeof(struct Node));
    struct Node *node1 = (struct Node *)malloc(sizeof(struct Node));
    struct Node *node2 = (struct Node *)malloc(sizeof(struct Node));

    head->data = 10;
    head->next = node1;

    node1->data = 20;
    node1->next = node2;

    node2->data = 30;
    node2->next = node1;

    printList(head);
    return 0;
}