/**
 * @fileoverview Single quote operations. PUT updates a quote's text, source,
 * author, URL, page number, and tags. DELETE removes a quote by ID.
 */
import { NextRequest, NextResponse } from 'next/server';
import { tursoQueries } from '@/lib/database/turso';

// PUT /api/quotes/[id] - Update a quote
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, source, author, url, pageNumber, tags } = body;

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: 'text is required',
        },
        { status: 400 }
      );
    }

    await tursoQueries.updateQuote(
      text,
      source || null,
      author || null,
      url || null,
      pageNumber || null,
      tags ? JSON.stringify(tags) : null,
      id
    );

    return NextResponse.json({
      success: true,
      data: {
        id: id,
        text,
        source,
        author,
        url,
        pageNumber,
        tags,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update quote',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/quotes/[id] - Delete a quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await tursoQueries.deleteQuote(id);

    return NextResponse.json({
      success: true,
      data: { id: id },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete quote',
      },
      { status: 500 }
    );
  }
}
